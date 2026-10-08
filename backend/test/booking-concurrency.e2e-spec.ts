import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { AuthModule } from '../src/auth/auth.module';
import { BookingsModule } from '../src/bookings/bookings.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { AuditLogsModule } from '../src/audit-logs/audit-logs.module';
import { WebhooksModule } from '../src/webhooks/webhooks.module';
import { PdfEngineModule } from '../src/pdf-engine/pdf-engine.module';
import { TrustModule } from '../src/trust/trust.module';
import { EntitlementsModule } from '../src/entitlements/entitlements.module';
import { TwilioModule } from '../src/integrations/twilio/twilio.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

/** Real authenticated HTTP requests + PostgreSQL transactions; no mock writes. */
describe('Booking overlap arbitration (live PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const runId = randomUUID();
  const agencyIds: string[] = [];
  const customers: string[] = [];
  const cars: string[] = [];
  const cookies: string[] = [];
  const dates = {
    startDate: '2035-01-01T12:00:00.000Z',
    endDate: '2035-01-03T12:00:00.000Z',
  };

  beforeAll(async () => {
    // Use production auth, tenancy guards, booking services and PostgreSQL.
    // Unrelated diagnostics/cloud integrations need not boot for a booking race.
    const module = await Test.createTestingModule({ imports: [
      ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule,
      BookingsModule, AuditLogsModule, WebhooksModule, PdfEngineModule,
      TrustModule, EntitlementsModule, TwilioModule,
    ] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);
    for (let i = 0; i < 2; i++) {
      const email = `concurrent-${i}-${runId}@e2e.test`;
      const password = `fixture-${runId}`;
      const registration = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password, name: 'Concurrency owner', agencyName: `Concurrency ${i} ${runId}` })
        .expect(201);
      const agencyId = registration.body.user.agencyId as string;
      agencyIds.push(agencyId);
      const login = await request(app.getHttpServer()).post('/api/auth/login')
        .send({ email, password }).expect(200);
      const header = login.headers['set-cookie'];
      cookies.push((Array.isArray(header) ? header : [header])[0]);
      const customer = await prisma.customer.create({ data: {
        agencyId, firstName: 'Fixture', lastName: 'Only', phone: '0000000000', identityNumber: runId,
      } });
      customers.push(customer.id);
      const car = await prisma.car.create({ data: {
        agencyId, brand: 'Fixture', model: 'Concurrency', year: 2025,
        licensePlate: runId, pricePerDay: 300,
      } });
      cars.push(car.id);
    }
    const secondCar = await prisma.car.create({ data: {
      agencyId: agencyIds[0], brand: 'Fixture', model: 'Independent', year: 2025,
      licensePlate: `second-${runId}`, pricePerDay: 300,
    } });
    cars.push(secondCar.id);
  }, 60_000);

  afterAll(async () => {
    jest.restoreAllMocks();
    // Only this run's fixtures; cleanup failures must be visible.
    try {
      if (prisma && agencyIds.length) {
        const resolvedCustomers = await prisma.customer.findMany({ where: { agencyId: { in: agencyIds } }, select: { renterIdentityId: true } });
        const fixtureIdentityIds = resolvedCustomers.flatMap((customer) => customer.renterIdentityId ? [customer.renterIdentityId] : []);
        await prisma.payment.deleteMany({ where: { invoice: { agencyId: { in: agencyIds } } } });
        await prisma.invoice.deleteMany({ where: { agencyId: { in: agencyIds } } });
        await prisma.booking.deleteMany({ where: { agencyId: { in: agencyIds } } });
        await prisma.car.deleteMany({ where: { agencyId: { in: agencyIds } } });
        await prisma.customer.deleteMany({ where: { agencyId: { in: agencyIds } } });
        await prisma.renterIdentity.deleteMany({ where: { id: { in: fixtureIdentityIds } } });
        await prisma.agencyMembership.deleteMany({ where: { agencyId: { in: agencyIds } } });
        await prisma.user.deleteMany({ where: { agencyId: { in: agencyIds } } });
        await prisma.agency.deleteMany({ where: { id: { in: agencyIds } } });
      }
    } finally {
      if (app) await app.close();
    }
  });

  const post = (carIndex = 0, tenantIndex = 0, range = dates) =>
    request(app.getHttpServer()).post('/api/bookings').set('Cookie', cookies[tenantIndex])
      .send({ carId: cars[carIndex], customerId: customers[tenantIndex], ...range });

  it('arbitrates two simultaneous requests after both pass the pre-check', async () => {
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customers[0] } })).renterIdentityId).toBeNull();
    // Hold both calls immediately before the real atomic identity write,
    // ensuring the first ever booking exercises simultaneous initialization.
    const originalUpsert = prisma.renterIdentity.upsert.bind(prisma.renterIdentity);
    let identityArrivals = 0;
    let releaseIdentity!: () => void;
    const identityBarrier = new Promise<void>((resolve) => { releaseIdentity = resolve; });
    const waitForBarrier = async (gate: Promise<void>) => {
      let timeout!: ReturnType<typeof setTimeout>;
      try {
        await Promise.race([gate, new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Concurrent request did not reach the expected database barrier')), 5000);
        })]);
      } finally { clearTimeout(timeout); }
    };
    const resolvedIds: string[] = [];
    const gatedUpsert = async (args: Prisma.RenterIdentityUpsertArgs) => {
      identityArrivals++;
      if (identityArrivals === 2) releaseIdentity();
      await waitForBarrier(identityBarrier);
      const identity = await originalUpsert(args);
      resolvedIds.push(identity.id);
      return identity;
    };
    const identityWrite = jest.spyOn(prisma.renterIdentity, 'upsert')
      .mockImplementation(gatedUpsert as unknown as typeof prisma.renterIdentity.upsert);
    const original = prisma.booking.findFirst.bind(prisma.booking);
    let arrivals = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    // Service awaits findFirst; the barrier does not exercise Prisma's fluent relations.
    const gatedRead = async (args?: Prisma.BookingFindFirstArgs) => {
      const found = await original(args);
      if (args?.where?.carId === cars[0]) {
        arrivals++;
        if (arrivals === 2) release();
        await waitForBarrier(barrier);
      }
      return found;
    };
    const precheck = jest.spyOn(prisma.booking, 'findFirst')
      .mockImplementation(gatedRead as unknown as typeof prisma.booking.findFirst);
    let responses;
    try {
      responses = await Promise.all([post(), post()]);
    } finally {
      precheck.mockRestore();
      identityWrite.mockRestore();
    }
    expect(identityArrivals).toBe(2);
    expect(resolvedIds).toHaveLength(2);
    expect(new Set(resolvedIds).size).toBe(1);
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customers[0] } })).renterIdentityId).toBe(resolvedIds[0]);
    expect(arrivals).toBe(2);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const bookings = await prisma.booking.findMany({ where: { carId: cars[0] }, include: { invoices: { include: { payments: true } } } });
    expect(bookings).toHaveLength(1);
    expect(bookings[0].invoices).toHaveLength(1);
    expect(bookings[0].invoices[0].payments).toHaveLength(1);
    expect(await prisma.invoice.count({ where: { agencyId: agencyIds[0] } })).toBe(1);
    expect(await prisma.payment.count({ where: { invoice: { agencyId: agencyIds[0] } } })).toBe(1);
  }, 30_000);

  it('rejects touching boundaries at the database layer, even bypassing the service', async () => {
    await expect(prisma.booking.create({ data: {
      agencyId: agencyIds[0], carId: cars[0], customerId: customers[0], totalPrice: 300,
      startDate: new Date(dates.endDate), endDate: new Date('2035-01-04T12:00:00Z'),
    } })).rejects.toThrow('booking_active_car_dates_excl');
  });

  it('keeps separate cars and tenants independent', async () => {
    await post(2, 0).expect(201);
    await post(1, 1).expect(201);
    await post(1, 0).expect(404);
  });

  it.each(['CANCELLED', 'COMPLETED'])('%s releases the interval', async (status) => {
    await prisma.booking.updateMany({ where: { carId: cars[0], status: 'REQUESTED' }, data: { status } });
    await post().expect(201);
  });

  it('rejects invalid date order even for direct database writes', async () => {
    await expect(prisma.booking.create({ data: {
      agencyId: agencyIds[0], carId: cars[0], customerId: customers[0], totalPrice: 300,
      status: 'CANCELLED', startDate: new Date(dates.endDate), endDate: new Date(dates.startDate),
    } })).rejects.toThrow('booking_date_order_check');
  });
});
