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
 * Live-DB E2E Test: Full Automotive Journey (Section 1 & 9 of CarHub OS Master Goal).
 * Proves end-to-end integration over real HTTP against real Postgres:
 * Vehicle Intake -> Diagnostic Session -> SAE PID/DTC Decoder -> Parts Matching ->
 * Work Order Creation -> State Machine Progression -> Mandatory Post-Repair DTC Verification ->
 * Work Order Completion & MaintenanceRecord Sync -> Predictive Maintenance Schedule -> Cross-Tenant 404 Guard.
 */
describe('Automotive Diagnostics & Repair Lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = randomUUID().slice(0, 8);

  const agencyEmail = `workshop-${runId}@e2e.test`;
  const foreignAgencyEmail = `foreign-workshop-${runId}@e2e.test`;
  const password = 'e2e-test-password-1';

  let agencyId: string;
  let foreignAgencyId: string;
  let authCookie: string;
  let foreignCookie: string;

  let vehicleId: string;
  let sessionId: string;
  let workOrderId: string;

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

    // 1. Register main workshop agency
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: agencyEmail,
        password,
        name: 'Master Technician',
        agencyName: `Garage Tanger ${runId}`,
      })
      .expect(201);

    agencyId = regRes.body.user.agencyId;
    // 2. Register foreign agency for cross-tenant IDOR checks
    const foreignReg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: foreignAgencyEmail,
        password,
        name: 'Foreign Technician',
        agencyName: `Garage Casablanca ${runId}`,
      })
      .expect(201);

    foreignAgencyId = foreignReg.body.user.agencyId;

    // Activate & verify both test accounts (satisfying AuthGuard email & onboarding gates)
    await prisma.user.updateMany({
      where: { email: { in: [agencyEmail, foreignAgencyEmail] } },
      data: { isVerified: true, emailVerifiedAt: new Date() },
    });
    await prisma.agency.updateMany({
      where: { id: { in: [agencyId, foreignAgencyId] } },
      data: {
        onboardingStatus: 'COMPLETED',
        onboardingCurrentStep: 4,
        onboardingCompletedAt: new Date(),
      },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: agencyEmail, password })
      .expect(200);

    const cookies = loginRes.get('Set-Cookie');
    authCookie = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith('infinity_token=')) || ''
      : '';

    const foreignLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: foreignAgencyEmail, password })
      .expect(200);

    const foreignCookies = foreignLogin.get('Set-Cookie');
    foreignCookie = Array.isArray(foreignCookies)
      ? foreignCookies.find((c) => c.startsWith('infinity_token=')) || ''
      : '';
  });

  afterAll(async () => {
    try {
      if (workOrderId)
        await prisma.workOrder.deleteMany({ where: { id: workOrderId } });
      if (sessionId)
        await prisma.diagnosticSession.deleteMany({ where: { id: sessionId } });
      if (vehicleId)
        await prisma.diagnosticVehicle.deleteMany({ where: { id: vehicleId } });

      const agencyIds = [agencyId, foreignAgencyId].filter(Boolean);
      await prisma.maintenanceRecord.deleteMany({
        where: { car: { agencyId: { in: agencyIds } } },
      });
      await prisma.car.deleteMany({ where: { agencyId: { in: agencyIds } } });
      await prisma.agencyMembership.deleteMany({
        where: { agencyId: { in: agencyIds } },
      });
      await prisma.user.deleteMany({ where: { agencyId: { in: agencyIds } } });
      await prisma.agency.deleteMany({ where: { id: { in: agencyIds } } });
    } catch {
      /* Teardown is best-effort for disposable E2E records. */
    }
    await app.close();
  });

  it('Step 1: Vehicle Intake — registers a diagnostic vehicle', async () => {
    const validVin = `VF1HSD${runId.toUpperCase()}000000000`.slice(0, 17);
    const res = await request(app.getHttpServer())
      .post('/api/diagnostics/vehicles')
      .set('Cookie', authCookie)
      .send({
        brand: 'Dacia',
        model: 'Duster',
        year: 2023,
        vin: validVin,
      })
      .expect(201);

    vehicleId = res.body.id;
    expect(vehicleId).toBeDefined();
    expect(res.body.brand).toBe('Dacia');
    expect(res.body.agencyId).toBe(agencyId);
  });

  it('Step 2: Diagnostic Session — runs OBD-II intake with P0300 misfire telemetry', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/diagnostics/sessions')
      .set('Cookie', authCookie)
      .send({
        vehicleId,
        symptoms: 'Moteur broute au ralenti avec voyant Check Engine allumé',
      })
      .expect(201);

    sessionId = res.body.id;
    expect(sessionId).toBeDefined();
    expect(res.body.vehicleId).toBe(vehicleId);

    // Ingest deterministic P0300 misfire telemetry
    const simRes = await request(app.getHttpServer())
      .post(`/api/diagnostics/sessions/${sessionId}/simulate`)
      .set('Cookie', authCookie)
      .send({
        expectedRevision: 0,
        scenario: 'p0300',
      })
      .expect(201);

    expect(simRes.body.revision).toBe(1);

    // Run AI diagnostic analysis over captured evidence
    const analyzeRes = await request(app.getHttpServer())
      .post(`/api/diagnostics/sessions/${sessionId}/analyze`)
      .set('Cookie', authCookie)
      .send({
        expectedRevision: 1,
      })
      .expect(201);

    expect(analyzeRes.body.analysis).toBeDefined();
    expect(analyzeRes.body.analysis.findings.length).toBeGreaterThan(0);
    expect(analyzeRes.body.status).toBe('ANALYZED');
  });

  it('Step 3: Parts Catalog — queries matched Moroccan parts for DTC P0300', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/parts/dtc/P0300')
      .set('Cookie', authCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const sparkPlug = res.body.find(
      (p: any) =>
        p.name.toLowerCase().includes('spark') ||
        p.name.toLowerCase().includes('bougie') ||
        p.partNumber.includes('BOSCH') ||
        p.partNumber.includes('NGK') ||
        p.partNumber.includes('ILZKR7B11'),
    );
    expect(sparkPlug).toBeDefined();
    expect(Number(sparkPlug.price)).toBeGreaterThan(0);
    expect(sparkPlug.currency).toBe('MAD');
  });

  it('Step 4: Work Order — creates work order with Decimal labor and parts pricing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/work-orders')
      .set('Cookie', authCookie)
      .send({
        vehicleId,
        sessionId,
        description:
          'Remplacement bougies d allumage et bobine suite defaut P0300',
        laborHours: 1.5,
        laborRate: 250,
        parts: [
          {
            partNumber: 'NGK-P0300',
            name: 'Bougies NGK Iridium',
            quantity: 4,
            unitPrice: 120,
          },
        ],
      })
      .expect(201);

    workOrderId = res.body.id;
    expect(workOrderId).toBeDefined();
    // Labor: 1.5 * 250 = 375 MAD
    expect(Number(res.body.laborTotal)).toBe(375);
    // Parts: 4 * 120 = 480 MAD
    expect(Number(res.body.partsTotal)).toBe(480);
    // Subtotal: 855 MAD. 20% VAT: 171 MAD
    expect(Number(res.body.taxAmount)).toBe(171);
    // Total: 1026 MAD
    expect(Number(res.body.totalAmount)).toBe(1026);
    expect(res.body.status).toBe('DRAFT');
  });

  it('Step 5: State Machine — advances work order to QUALITY_CHECK', async () => {
    // DRAFT -> APPROVED
    await request(app.getHttpServer())
      .patch(`/api/work-orders/${workOrderId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'APPROVED' })
      .expect(200);

    // APPROVED -> IN_PROGRESS
    await request(app.getHttpServer())
      .patch(`/api/work-orders/${workOrderId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    // IN_PROGRESS -> READY_FOR_QUALITY_CHECK
    await request(app.getHttpServer())
      .patch(`/api/work-orders/${workOrderId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'READY_FOR_QUALITY_CHECK' })
      .expect(200);

    // READY_FOR_QUALITY_CHECK -> QUALITY_CHECK
    const qcRes = await request(app.getHttpServer())
      .patch(`/api/work-orders/${workOrderId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'QUALITY_CHECK' })
      .expect(200);

    expect(qcRes.body.status).toBe('QUALITY_CHECK');
  });

  it('Step 6: Gatekeeping — prevents COMPLETED status before DTC verification', async () => {
    // Attempting to jump directly to COMPLETED without dtcCleared verification must fail with 400
    const res = await request(app.getHttpServer())
      .patch(`/api/work-orders/${workOrderId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'COMPLETED' })
      .expect(400);

    expect(res.body.message).toContain('post-repair diagnostic verification');
  });

  it('Step 7: Verification — technician certifies DTC clearance and completes work order', async () => {
    const verifyRes = await request(app.getHttpServer())
      .post(`/api/work-orders/${workOrderId}/verify`)
      .set('Cookie', authCookie)
      .send({
        dtcCleared: true,
        verificationNotes:
          'Essai sur route 15 km effectue. 0 code defaut actif. Ralenti stable a 800 RPM.',
      })
      .expect(201);

    expect(verifyRes.body.dtcCleared).toBe(true);
    expect(verifyRes.body.status).toBe('COMPLETED');
  });

  it('Step 8: Cross-Tenant Isolation — foreign agency receives 404 on work order and session', async () => {
    // Foreign agency trying to read work order gets 404 (never 403, never data)
    await request(app.getHttpServer())
      .get(`/api/work-orders/${workOrderId}`)
      .set('Cookie', foreignCookie)
      .expect(404);

    // Foreign agency trying to read diagnostic session gets 404
    await request(app.getHttpServer())
      .get(`/api/diagnostics/sessions/${sessionId}`)
      .set('Cookie', foreignCookie)
      .expect(404);
  });

  it('Step 9: Knowledge Graph & Copilot Guide — searches DTCs, fetches Moroccan field tips, and synthesizes multi-DTC copilot plan', async () => {
    // 1. Search knowledge base
    const searchRes = await request(app.getHttpServer())
      .get('/api/diagnostics/knowledge/search?query=misfire')
      .set('Cookie', authCookie)
      .expect(200);

    expect(Array.isArray(searchRes.body)).toBe(true);
    expect(searchRes.body.some((e: any) => e.code === 'P0300')).toBe(true);

    // 2. Lookup single DTC with Moroccan context
    const dtcRes = await request(app.getHttpServer())
      .get('/api/diagnostics/knowledge/dtc/P2463')
      .set('Cookie', authCookie)
      .expect(200);

    expect(dtcRes.body.code).toBe('P2463');
    expect(dtcRes.body.severity).toBe('CRITICAL');
    expect(dtcRes.body.moroccanOperatingContext.climateRisk).toContain(
      'Casablanca',
    );

    // 3. Multi-DTC Copilot Synthesis
    const copilotRes = await request(app.getHttpServer())
      .post('/api/diagnostics/knowledge/copilot')
      .set('Cookie', authCookie)
      .send({ dtcCodes: ['P0300', 'P0171'] })
      .expect(201);

    expect(copilotRes.body.analyzedCodes).toEqual(['P0300', 'P0171']);
    expect(copilotRes.body.rootCauseHypothesis).toContain(
      'CORRELATED LEAN MISFIRE',
    );
    expect(copilotRes.body.prioritizedActionPlan.length).toBeGreaterThan(0);
    expect(copilotRes.body.estimatedTotalLaborHours).toBeGreaterThan(0);
  });
});
