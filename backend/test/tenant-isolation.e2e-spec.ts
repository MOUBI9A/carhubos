import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
import { DecimalToNumberInterceptor } from './../src/common/interceptors/decimal-to-number.interceptor';

/**
 * Live-DB e2e: proves auth + tenant isolation over real HTTP against a real
 * Postgres, not mocked Prisma. Mirrors main.ts's bootstrap (global prefix,
 * ValidationPipe, cookie parsing) so behaviour matches production, not a
 * bare TestingModule default.
 *
 * EXECUTION_PLAN.md T4 acceptance: "proves login + a cross-tenant 404 over
 * HTTP." Test fixtures are namespaced with a run-scoped UUID and torn down
 * in afterAll so repeat runs against a shared dev DB don't collide or leak.
 */
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = randomUUID().slice(0, 8);

  const agencyAEmail = `owner-a-${runId}@e2e.test`;
  const agencyBEmail = `owner-b-${runId}@e2e.test`;
  const password = 'e2e-test-password-1';

  let agencyAId: string;
  let agencyBId: string;
  let carAId: string;
  let cookieA: string;
  let cookieB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new DecimalToNumberInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Best-effort cleanup, ordered for FK constraints. Never let a cleanup
    // failure mask the actual test result.
    try {
      if (carAId) await prisma.car.deleteMany({ where: { id: carAId } });
      if (agencyAId || agencyBId) {
        await prisma.agencyMembership.deleteMany({
          where: { agencyId: { in: [agencyAId, agencyBId].filter(Boolean) } },
        });
        await prisma.user.deleteMany({
          where: { agencyId: { in: [agencyAId, agencyBId].filter(Boolean) } },
        });
        await prisma.agency.deleteMany({
          where: { id: { in: [agencyAId, agencyBId].filter(Boolean) } },
        });
      }
    } catch {
      // fixtures are namespaced by runId; a failed cleanup is a nuisance,
      // not a correctness issue.
    }
    await app.close();
  });

  it('registers a fresh OWNER + agency (agency A)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: agencyAEmail,
        password,
        name: 'Agency A Owner',
        agencyName: `E2E Agency A ${runId}`,
        legalNoticeAcknowledged: true,
        confirmsAdultAndAuthority: true,
      })
      .expect(201);

    agencyAId = res.body.user.agencyId;
    expect(res.body.user.email).toBe(agencyAEmail);
    expect(agencyAId).toBeDefined();
  });

  it('registers a second, independent OWNER + agency (agency B)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: agencyBEmail,
        password,
        name: 'Agency B Owner',
        agencyName: `E2E Agency B ${runId}`,
        legalNoticeAcknowledged: true,
        confirmsAdultAndAuthority: true,
      })
      .expect(201);

    agencyBId = res.body.user.agencyId;
    expect(agencyBId).toBeDefined();
    expect(agencyBId).not.toBe(agencyAId);
  });

  it('activates and verifies both test accounts for e2e access', async () => {
    await prisma.user.updateMany({
      where: { email: { in: [agencyAEmail, agencyBEmail] } },
      data: { isVerified: true, emailVerifiedAt: new Date() },
    });
    await prisma.agency.updateMany({
      where: { id: { in: [agencyAId, agencyBId] } },
      data: {
        onboardingStatus: 'COMPLETED',
        onboardingCurrentStep: 4,
        onboardingCompletedAt: new Date(),
      },
    });
  });

  it('logs in agency A and agency B, each getting their own session cookie', async () => {
    const loginA = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: agencyAEmail, password })
      .expect(200);
    const setCookieA = loginA.headers['set-cookie'];
    expect(setCookieA).toBeDefined();
    cookieA = (Array.isArray(setCookieA) ? setCookieA : [setCookieA])[0];
    expect(cookieA).toContain('infinity_token=');

    const loginB = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: agencyBEmail, password })
      .expect(200);
    const setCookieB = loginB.headers['set-cookie'];
    cookieB = (Array.isArray(setCookieB) ? setCookieB : [setCookieB])[0];
    expect(cookieB).toContain('infinity_token=');
  });

  it('rejects a wrong password with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: agencyAEmail, password: 'definitely-wrong' })
      .expect(401);
  });

  it('agency A can create and read its own car', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/cars')
      .set('Cookie', cookieA)
      .send({
        brand: 'Dacia',
        model: 'Duster',
        year: 2023,
        licensePlate: `E2E-${runId}`,
        pricePerDay: 350,
      })
      .expect(201);
    carAId = create.body.id;
    expect(carAId).toBeDefined();

    await request(app.getHttpServer())
      .get(`/api/cars/${carAId}`)
      .set('Cookie', cookieA)
      .expect(200);
  });

  it('agency B gets 404 (not 403) reading agency A\'s car — tenant isolation', async () => {
    // CLAUDE.md invariant #1: a cross-tenant read must 404, never leak
    // existence via 403.
    await request(app.getHttpServer())
      .get(`/api/cars/${carAId}`)
      .set('Cookie', cookieB)
      .expect(404);
  });
});
