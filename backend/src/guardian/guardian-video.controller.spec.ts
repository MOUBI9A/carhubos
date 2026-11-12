import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  GuardianStaffController,
  GuardianCustomerController,
} from './guardian.controller';
import { GuardianService } from './guardian.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Guardian signed video HTTP authentication and capability boundary', () => {
  let app: INestApplication;
  const id = randomUUID(),
    intent = randomUUID(),
    actor = randomUUID(),
    agency = randomUUID();
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  const storage = { token: 'memory-only', storagePath: 'server-chosen' };
  const service = {
    initiateVideoUpload: jest.fn(async () => storage),
    listVideoUploads: jest.fn(async () => []),
    resumeVideoUpload: jest.fn(async () => storage),
    finalizeVideoUpload: jest.fn(async () => ({ revision: 2 })),
    cancelVideoUpload: jest.fn(async () => ({ status: 'CANCELED' })),
  };
  const membership = jest.fn();
  const body = {
    revision: 1,
    kind: 'VIDEO',
    filename: 'capture.mp4',
    mimeType: 'video/mp4',
    expectedSizeBytes: 40000000,
  };
  const token = (role = 'AGENT') =>
    jwt.sign({ sub: actor, agencyId: agency, role, isVerified: true });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GuardianStaffController, GuardianCustomerController],
      providers: [
        { provide: GuardianService, useValue: service },
        { provide: JwtService, useValue: jwt },
        {
          provide: PrismaService,
          useValue: { agencyMembership: { findUnique: membership } },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    membership.mockResolvedValue({ capabilities: ['inspection.perform'] });
  });
  const base = `/guardian/staff/reports/${id}/upload-intents`;

  it('requires authentication and inspection.perform for every new route', async () => {
    for (const [method, path] of [
      ['post', base],
      ['get', base],
      ['post', `${base}/${intent}/resume`],
      ['post', `${base}/${intent}/finalize`],
      ['post', `${base}/${intent}/cancel`],
    ] as const) {
      await request(app.getHttpServer())
        [method](path)
        .send(method === 'get' ? undefined : body)
        .expect(401);
      membership.mockResolvedValueOnce({ capabilities: ['booking.view'] });
      await request(app.getHttpServer())
        [method](path)
        .set('Authorization', `Bearer ${token()}`)
        .send(method === 'get' ? undefined : body)
        .expect(403);
    }
    expect(service.initiateVideoUpload).not.toHaveBeenCalled();
    expect(service.finalizeVideoUpload).not.toHaveBeenCalled();
  });

  it('uses JWT actor/agency, rejects arbitrary path/tenant and prevents caching signed tokens', async () => {
    const response = await request(app.getHttpServer())
      .post(base)
      .set('Authorization', `Bearer ${token()}`)
      .send(body)
      .expect(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.initiateVideoUpload).toHaveBeenCalledWith(
      actor,
      agency,
      id,
      body,
    );
    expect(membership).toHaveBeenCalledWith({
      where: { userId_agencyId: { userId: actor, agencyId: agency } },
    });
    for (const extra of [
      { storagePath: 'attacker' },
      { agencyId: randomUUID() },
      { bucketName: 'public' },
      { actorId: randomUUID() },
    ])
      await request(app.getHttpServer())
        .post(base)
        .set('Authorization', `Bearer ${token()}`)
        .send({ ...body, ...extra })
        .expect(400);
    expect(service.initiateVideoUpload).toHaveBeenCalledTimes(1);
  });

  it('keeps renter video routes closed and rejects malformed UUIDs', async () => {
    membership.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post(base)
      .set('Authorization', `Bearer ${token('RENTER')}`)
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/guardian/customer/reports/${id}/upload-intents`)
      .set('Authorization', `Bearer ${token('RENTER')}`)
      .send(body)
      .expect(404);
    membership.mockResolvedValue({ capabilities: ['inspection.perform'] });
    await request(app.getHttpServer())
      .post(`${base}/invalid/finalize`)
      .set('Authorization', `Bearer ${token()}`)
      .send({})
      .expect(400);
  });
});
