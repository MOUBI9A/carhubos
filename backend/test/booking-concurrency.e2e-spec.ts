import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ROLE_PRESETS } from './../src/common/capabilities';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
import { DecimalToNumberInterceptor } from './../src/common/interceptors/decimal-to-number.interceptor';

describe('Booking concurrency & race conditions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = randomUUID().slice(0, 8);

  const ownerEmail = `concurrency-owner-${runId}@e2e.test`;
  const password = 'concurrency-pwd-123';

  let agencyId: string;
  let carId: string;
  let customerId: string;
  let cookie: string;

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

    // 1. Create tenant fixture
    const agency = await prisma.agency.create({
      data: {
        name: `Concurrency Agency ${runId}`,
        city: 'Casablanca',
        address: '123 Concurrency Blvd',
        contactEmail: `agency-${runId}@e2e.test`,
      },
    });
    agencyId = agency.id;

    // 2. Create owner user & membership
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: ownerEmail,
        password: hash,
        name: 'Concurrency Owner',
        role: 'OWNER',
        agencyId,
      },
    });

    await prisma.agencyMembership.create({
      data: {
        userId: user.id,
        agencyId,
        rolePreset: 'OWNER',
        capabilities: ROLE_PRESETS.OWNER,
      },
    });

    // 3. Create test car
    const car = await prisma.car.create({
      data: {
        brand: 'Porsche',
        model: 'Macan',
        year: 2024,
        licensePlate: `CONC-${runId}`,
        pricePerDay: 1500,
        mileage: 10000,
        status: 'AVAILABLE',
        agencyId,
      },
    });
    carId = car.id;

    // 4. Create test customer
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Taha',
        lastName: 'Rachidi',
        phone: '+212600998877',
        identityNumber: `C${runId}`,
        agencyId,
      },
    });
    customerId = customer.id;

    // 5. Authenticate
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ownerEmail, password });
    const rawCookie = loginRes.headers['set-cookie'];
    const cookieList = Array.isArray(rawCookie) ? rawCookie : rawCookie ? [rawCookie] : [];
    cookie = cookieList.find((c: string) => c.startsWith('infinity_token=')) || '';
  });

  afterAll(async () => {
    // Cleanup fixtures
    if (agencyId) {
      try {
        await prisma.payment.deleteMany({ where: { invoice: { agencyId } } });
        await prisma.invoice.deleteMany({ where: { agencyId } });
        await prisma.refusalLog.deleteMany({ where: { agencyId } });
        await prisma.booking.deleteMany({ where: { agencyId } });
        await prisma.customer.deleteMany({ where: { agencyId } });
        await prisma.car.deleteMany({ where: { agencyId } });
        await prisma.agencyMembership.deleteMany({ where: { agencyId } });
        await prisma.user.deleteMany({ where: { agencyId } });
        await prisma.agency.delete({ where: { id: agencyId } });
      } catch (err) {
        console.warn('Cleanup warning:', err);
      }
    }
    if (app) {
      await app.close();
    }
  });

  it('rejects double bookings under simultaneous concurrent requests for overlapping dates', async () => {
    const bookingPayload = {
      carId,
      customerId,
      startDate: '2026-12-01T10:00:00.000Z',
      endDate: '2026-12-05T10:00:00.000Z',
      depositAmount: 3000,
      depositMethod: 'CASH',
    };

    // Fire 2 concurrent requests at the exact same moment
    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/bookings')
        .set('Cookie', cookie)
        .send(bookingPayload),
      request(app.getHttpServer())
        .post('/api/bookings')
        .set('Cookie', cookie)
        .send(bookingPayload),
    ]);

    const statuses = [res1.status, res2.status].sort();

    // Exactly one must succeed (201), and one must fail (400)
    expect(statuses).toEqual([201, 400]);

    // Verify database record count
    const createdBookings = await prisma.booking.findMany({
      where: { carId, agencyId },
    });
    expect(createdBookings.length).toBe(1);
  });
});
