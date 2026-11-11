import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createHash, randomUUID } from 'crypto';
import { canonicalReportJson } from './reports/report-integrity';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const databaseDescribe =
  process.env.DIAGNOSTICS_DB_TEST === '1' ? describe : describe.skip;
databaseDescribe('Diagnostics authenticated PostgreSQL workflow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const agencyA = randomUUID(),
    agencyB = randomUUID(),
    actorA = randomUUID(),
    actorB = randomUUID(),
    viewer = randomUUID();
  let tokenA: string,
    tokenB: string,
    tokenViewer: string,
    vehicleId: string,
    sessionId: string;
  const cap = [
    'diagnostics.view',
    'diagnostics.perform',
    'diagnostics.confirm',
    'diagnostics.estimate',
  ];
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    for (const [agency, id] of [
      [agencyA, actorA],
      [agencyB, actorB],
    ]) {
      await prisma.agency.create({
        data: {
          id: agency,
          name: 'Diagnostic isolated test',
          contactEmail: `${agency}@diagnostics.test`,
          onboardingStatus: 'COMPLETED',
        },
      });
      await prisma.user.create({
        data: {
          id,
          agencyId: agency,
          email: `${id}@diagnostics.test`,
          name: 'Test technician',
          password: 'unused-fixture-only',
          role: 'OWNER',
          isVerified: true,
        },
      });
      await prisma.agencyMembership.create({
        data: {
          agencyId: agency,
          userId: id,
          rolePreset: 'OWNER',
          capabilities: cap,
        },
      });
    }
    await prisma.user.create({
      data: {
        id: viewer,
        agencyId: agencyA,
        email: `${viewer}@diagnostics.test`,
        name: 'Test viewer',
        password: 'unused-fixture-only',
        role: 'AGENT',
        isVerified: true,
      },
    });
    await prisma.agencyMembership.create({
      data: {
        agencyId: agencyA,
        userId: viewer,
        rolePreset: 'Viewer',
        capabilities: ['diagnostics.view'],
      },
    });
    const jwt = app.get(JwtService);
    tokenA = jwt.sign({ sub: actorA, agencyId: agencyA, role: 'OWNER', isVerified: true });
    tokenB = jwt.sign({ sub: actorB, agencyId: agencyB, role: 'OWNER', isVerified: true });
    tokenViewer = jwt.sign({ sub: viewer, agencyId: agencyA, role: 'AGENT', isVerified: true });
  }, 60000);
  afterAll(async () => {
    if (prisma) {
      await prisma.auditLog.deleteMany({
        where: { agencyId: { in: [agencyA, agencyB] } },
      });
      await prisma.diagnosticSession.deleteMany({
        where: { agencyId: { in: [agencyA, agencyB] } },
      });
      await prisma.diagnosticVehicle.deleteMany({
        where: { agencyId: { in: [agencyA, agencyB] } },
      });
      await prisma.agencyMembership.deleteMany({
        where: { agencyId: { in: [agencyA, agencyB] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [actorA, actorB, viewer] } },
      });
      await prisma.agency.deleteMany({
        where: { id: { in: [agencyA, agencyB] } },
      });
    }
    await app?.close();
  });
  const get = (path: string, token = tokenA) =>
    request(app.getHttpServer())
      .get(`/api/diagnostics/${path}`)
      .auth(token, { type: 'bearer' });
  const post = (path: string, body: object, token = tokenA) =>
    request(app.getHttpServer())
      .post(`/api/diagnostics/${path}`)
      .auth(token, { type: 'bearer' })
      .send(body);
  it('creates a shop vehicle without a rental record; rejects tenant override', async () => {
    await post('vehicles', {
      brand: 'Demo',
      model: 'Car',
      agencyId: agencyB,
    }).expect(400);
    const created = await post('vehicles', {
      brand: 'Demo',
      model: 'Car',
      vin: '1HGCM82633A004352',
      year: 2003,
    }).expect(201);
    vehicleId = created.body.id;
    const session = await post('sessions', {
      vehicleId,
      symptoms: 'Rough idle',
    }).expect(201);
    sessionId = session.body.id;
    expect(session.body.source).toBe('IMPORT');
    expect(session.body.revision).toBe(0);
  });
  it('enforces foreign tenant404 and read-only capability403 on every workflow boundary', async () => {
    await get(`sessions/${sessionId}`, tokenB).expect(404);
    await post('sessions', { vehicleId }, tokenB).expect(404);
    await post(
      `sessions/${sessionId}/analyze`,
      { expectedRevision: 0 },
      tokenB,
    ).expect(404);
    await get(`sessions/${sessionId}/report`, tokenB).expect(404);
    await get(`sessions/${sessionId}/report.pdf`, tokenB).expect(404);
    await post(
      `sessions/${sessionId}/simulate`,
      { scenario: 'normal_idle', expectedRevision: 0 },
      tokenViewer,
    ).expect(403);
    const access = await get('access', tokenViewer).expect(200);
    expect(access.body.capabilities).toEqual(['diagnostics.view']);
  });
  it('completes explicit simulation, required test evidence, technician review, exact Decimal estimate and immutable report', async () => {
    let session = (
      await post(`sessions/${sessionId}/simulate`, {
        scenario: 'p0420',
        seed: 42,
        expectedRevision: 0,
      }).expect(201)
    ).body;
    expect(session.source).toBe('SIMULATOR');
    expect(session.dtcs[0].freezeFrameSource).toBe('SIMULATED');
    await post(`sessions/${sessionId}/events`, {
      expectedRevision: session.revision,
      events: [],
    }).expect(409);
    session = (
      await post(`sessions/${sessionId}/analyze`, {
        expectedRevision: session.revision,
      }).expect(201)
    ).body;
    expect(session.analysis.provider).toBe('DETERMINISTIC');
    await post(`sessions/${sessionId}/confirm`, {
      expectedRevision: session.revision,
      findingIds: ['dtc-P0420'],
      notes: 'Reviewed',
    }).expect(400);
    session = (
      await post(`sessions/${sessionId}/tests`, {
        expectedRevision: session.revision,
        testId: 'catalyst-verification',
        result: 'PASS',
        notes:
          'Demonstration only: verified scenario evidence, no real hardware test.',
      }).expect(201)
    ).body;
    session = (
      await post(`sessions/${sessionId}/confirm`, {
        expectedRevision: session.revision,
        findingIds: ['dtc-P0420'],
        notes: 'Simulator workflow demonstration; no real repair decision.',
      }).expect(201)
    ).body;
    await request(app.getHttpServer())
      .put(`/api/diagnostics/sessions/${sessionId}/estimate`)
      .auth(tokenViewer, { type: 'bearer' })
      .send({
        expectedRevision: session.revision,
        items: [
          {
            kind: 'LABOR',
            description: 'Inspection',
            quantity: '1',
            unitPrice: '100.05',
          },
        ],
      })
      .expect(403);
    session = (
      await request(app.getHttpServer())
        .put(`/api/diagnostics/sessions/${sessionId}/estimate`)
        .auth(tokenA, { type: 'bearer' })
        .send({
          expectedRevision: session.revision,
          items: [
            {
              kind: 'LABOR',
              description: 'Inspection',
              quantity: '1.333',
              unitPrice: '100.05',
            },
          ],
        })
        .expect(200)
    ).body;
    expect(session.estimate.total).toBe('160.04');
    expect(session.estimate.fitmentVerified).toBe(false);
    session = (
      await post(`sessions/${sessionId}/report`, {
        expectedRevision: session.revision,
      }).expect(201)
    ).body;
    expect(session.status).toBe('REPORTED');
    expect(session.report.provenance).toContain('SIMULATED');
    expect(session.report.contentHash).toMatch(/^[a-f0-9]{64}$/);
    const original = (await get(`sessions/${sessionId}/report`).expect(200))
      .body;
    const { contentHash, ...snapshot } = original;
    expect(
      createHash('sha256').update(canonicalReportJson(snapshot)).digest('hex'),
    ).toBe(contentHash);
    await post(`sessions/${sessionId}/analyze`, {
      expectedRevision: session.revision,
    }).expect(409);
    expect(
      (await get(`sessions/${sessionId}/report`).expect(200)).body,
    ).toEqual(original);
  });
  it('serializes simultaneous writers; replay does not create a new revision or audit', async () => {
    const session = (await post('sessions', { vehicleId }).expect(201)).body;
    const event = {
      eventId: 'capture',
      streamId: 'adapter',
      sequence: 0,
      observedAt: new Date().toISOString(),
      mode: 1,
      pid: 0x0c,
      bytes: [12, 128],
    };
    const responses = await Promise.all([
      post(`sessions/${session.id}/events`, {
        expectedRevision: 0,
        events: [event],
      }),
      post(`sessions/${session.id}/events`, {
        expectedRevision: 0,
        events: [{ ...event, eventId: 'competing' }],
      }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const saved = (await get(`sessions/${session.id}`)).body;
    const replay = {
      eventId: saved.events[0].eventId,
      streamId: saved.events[0].streamId,
      sequence: saved.events[0].sequence,
      observedAt: saved.events[0].observedAt,
      mode: 1,
      pid: saved.events[0].pid,
      bytes: saved.events[0].bytes,
    };
    const before = await prisma.auditLog.count({
      where: { entityId: session.id },
    });
    const repeated = (
      await post(`sessions/${session.id}/events`, {
        expectedRevision: saved.revision,
        events: [replay],
      }).expect(201)
    ).body;
    expect(repeated.revision).toBe(saved.revision);
    expect(
      await prisma.auditLog.count({ where: { entityId: session.id } }),
    ).toBe(before);
    await post(`sessions/${session.id}/events`, {
      expectedRevision: saved.revision,
      events: [{ ...replay, bytes: [0, 1] }],
    }).expect(409);
  });
});
