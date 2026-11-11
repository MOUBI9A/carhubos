import {
  BadRequestException,
  ConflictException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioService } from '../integrations/twilio/twilio.service';
import { GuardianNotificationsController } from './guardian-notifications.controller';
import {
  GuardianNotificationsService,
  guardianCustomerPhone,
} from './guardian-notifications.service';

function setup() {
  const report: any = {
    id: 'report-1',
    agencyId: 'agency-1',
    revision: 3,
    status: 'CUSTOMER_REVIEW',
    phase: 'OUT',
    publishedAt: new Date(),
    agency: { name: 'Sample agency' },
    booking: {
      agencyId: 'agency-1',
      renterId: 'renter-1',
      customer: {
        agencyId: 'agency-1',
        userId: 'renter-1',
        phone: '06 12 34 56 78',
      },
    },
  };
  const events: any[] = [];
  let locked = false;
  let queue = Promise.resolve();
  const prisma: any = {
    guardianReport: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === report.id &&
        where.agencyId === report.agencyId &&
        report.status !== 'DRAFT'
          ? report
          : null,
      ),
    },
    guardianEvent: {
      findFirst: jest.fn(
        async ({ where }: any) =>
          [...events]
            .reverse()
            .find(
              (event) =>
                event.reportId === where.reportId &&
                event.revision === where.revision &&
                event.action === where.action &&
                (!where.details ||
                  event.details.attemptId === where.details.equals),
            ) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const event = { id: `event-${events.length}`, ...data };
        events.push(event);
        return event;
      }),
    },
    agencyMembership: {
      findUnique: jest.fn().mockResolvedValue({
        capabilities: ['booking.view', 'booking.manage'],
      }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'report-1' }]),
    $transaction: jest.fn((fn: (tx: any) => Promise<any>) => {
      const result = queue.then(async () => {
        locked = true;
        try {
          return await fn(prisma);
        } finally {
          locked = false;
        }
      });
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    }),
  };
  const twilio = {
    guardianWhatsAppAvailability: jest.fn().mockReturnValue({ state: 'READY' }),
    sendGuardianReportNotification: jest.fn(async () => {
      expect(locked).toBe(false);
      return {
        state: 'PROVIDER_ACCEPTED',
        message: 'Provider accepted; delivery unverified.',
        providerSid: 'SM-test',
        providerStatus: 'queued',
      };
    }),
  };
  const config = {
    get: jest.fn((key: string, fallback?: string) =>
      key === 'PUBLIC_APP_URL' ? 'https://portal.example.test' : fallback,
    ),
  };
  const service = new GuardianNotificationsService(
    prisma,
    twilio as any,
    config as any,
  );
  return { report, events, prisma, twilio, config, service };
}

describe('Guardian report WhatsApp notifications', () => {
  it.each([
    ['06 12 34 56 78', '+212612345678'],
    ['07.12.34.56.78', '+212712345678'],
    ['00212 612345678', '+212612345678'],
    ['+33 (6) 12 34 56 78', '+33612345678'],
    ['612345678', null],
    ['+212612345678 ext 2', null],
    ['+12', null],
    ['whatsapp:+212612345678', null],
  ])(
    'normalizes only supported customer phone formats: %s',
    (input, expected) => {
      expect(guardianCustomerPhone(input)).toBe(expected);
    },
  );

  it('previews a masked booking customer recipient without sending or recording an attempt', async () => {
    const { service, twilio, events } = setup();
    await expect(service.preview('agency-1', 'report-1')).resolves.toEqual({
      recipient: '••••5678',
      state: 'READY',
    });
    expect(twilio.sendGuardianReportNotification).not.toHaveBeenCalled();
    expect(events).toHaveLength(0);
  });

  it.each(['agency-other', '', undefined])(
    'rejects foreign or absent agency scope: %s',
    async (agency) => {
      const { service, twilio } = setup();
      await expect(
        service.send(agency as string, 'staff-1', 'report-1', 3),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(twilio.sendGuardianReportNotification).not.toHaveBeenCalled();
    },
  );

  it('rejects draft, stale revision and missing renter association', async () => {
    const { service, report, twilio } = setup();
    report.status = 'DRAFT';
    await expect(
      service.preview('agency-1', 'report-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    report.status = 'CUSTOMER_REVIEW';
    await expect(
      service.send('agency-1', 'staff-1', 'report-1', 2),
    ).rejects.toBeInstanceOf(ConflictException);
    report.booking.renterId = null;
    report.booking.customer.userId = null;
    await expect(
      service.send('agency-1', 'staff-1', 'report-1', 3),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(twilio.sendGuardianReportNotification).not.toHaveBeenCalled();
  });

  it('fails closed on corrupt cross-agency customer relations and invalid recipient', async () => {
    const { service, report, twilio } = setup();
    report.booking.customer.agencyId = 'agency-other';
    await expect(
      service.send('agency-1', 'staff-1', 'report-1', 3),
    ).rejects.toBeInstanceOf(NotFoundException);
    report.booking.customer.agencyId = 'agency-1';
    report.booking.customer.phone = '+212612345678; +212698765432';
    await expect(
      service.send('agency-1', 'staff-1', 'report-1', 3),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(twilio.sendGuardianReportNotification).not.toHaveBeenCalled();
  });

  it('refuses mismatched renter/customer identities and an absent actor before reserving or sending', async () => {
    const { service, report, twilio, events } = setup();
    await expect(
      service.send('agency-1', '', 'report-1', 3),
    ).rejects.toBeInstanceOf(NotFoundException);
    report.booking.customer.userId = 'different-renter';
    await expect(
      service.send('agency-1', 'staff-1', 'report-1', 3),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(twilio.sendGuardianReportNotification).not.toHaveBeenCalled();
    expect(events).toHaveLength(0);
  });

  it.each(['SIMULATED', 'UNCONFIGURED'])(
    'audits %s truthfully without making a provider request',
    async (state) => {
      const { service, twilio, events } = setup();
      twilio.guardianWhatsAppAvailability.mockReturnValue({
        state,
        reason: 'Not enabled.',
      });
      const result = await service.send('agency-1', 'staff-1', 'report-1', 3);
      expect(result.state).toBe(state);
      expect(twilio.sendGuardianReportNotification).not.toHaveBeenCalled();
      expect(events.map((e) => e.action)).toEqual([
        'WHATSAPP_NOTIFICATION_RESULT',
      ]);
      expect(JSON.stringify(events)).not.toContain('+212612345678');
    },
  );

  it.each([
    '',
    'javascript:alert(1)',
    'https://user:pass@portal.example.test',
    'http://public.example.test',
  ])('will not send an invalid portal origin: %s', async (url) => {
    const { service, config, twilio } = setup();
    config.get.mockReturnValue(url);
    expect(
      (await service.send('agency-1', 'staff-1', 'report-1', 3)).state,
    ).toBe('UNCONFIGURED');
    expect(twilio.sendGuardianReportNotification).not.toHaveBeenCalled();
  });

  it('reserves a live attempt durably before sending only the linked booking customer a private portal link', async () => {
    const { service, twilio, events } = setup();
    expect(
      await service.send('agency-1', 'staff-1', 'report-1', 3),
    ).toMatchObject({
      state: 'PROVIDER_ACCEPTED',
      revision: 3,
      recipient: '••••5678',
    });
    expect(twilio.sendGuardianReportNotification).toHaveBeenCalledWith(
      'agency-1',
      '+212612345678',
      {
        '1': 'Sample agency',
        '2': 'OUT',
        '3': '3',
        '4': 'https://portal.example.test/portal/inspections?reportId=report-1',
      },
    );
    expect(events.map((e) => e.action)).toEqual([
      'WHATSAPP_NOTIFICATION_ATTEMPT',
      'WHATSAPP_NOTIFICATION_RESULT',
    ]);
    expect(events[1].details.attemptId).toBe(events[0].id);
  });

  it('serializes parallel send requests to one provider attempt per report revision', async () => {
    const { service, twilio } = setup();
    const results = await Promise.all([
      service.send('agency-1', 'staff-1', 'report-1', 3),
      service.send('agency-1', 'staff-1', 'report-1', 3),
    ]);
    expect(twilio.sendGuardianReportNotification).toHaveBeenCalledTimes(1);
    expect(results.some((result) => result.duplicate)).toBe(true);
    expect(
      results.every((result) =>
        ['PROVIDER_ACCEPTED', 'IN_PROGRESS'].includes(result.state),
      ),
    ).toBe(true);
  });

  it('never retries an unknown provider outcome for the same revision', async () => {
    const { service, twilio } = setup();
    twilio.sendGuardianReportNotification.mockResolvedValue({
      state: 'FAILED',
      message: 'Acceptance unknown.',
      acceptanceUnknown: true,
    } as any);
    expect(
      (await service.send('agency-1', 'staff-1', 'report-1', 3)).state,
    ).toBe('FAILED');
    expect(
      await service.send('agency-1', 'staff-1', 'report-1', 3),
    ).toMatchObject({
      state: 'FAILED',
      duplicate: true,
      acceptanceUnknown: true,
    });
    expect(twilio.sendGuardianReportNotification).toHaveBeenCalledTimes(1);
  });

  it('a simulated result does not suppress a later explicitly requested live attempt', async () => {
    const { service, twilio } = setup();
    twilio.guardianWhatsAppAvailability.mockReturnValueOnce({
      state: 'SIMULATED',
    });
    await service.send('agency-1', 'staff-1', 'report-1', 3);
    await service.send('agency-1', 'staff-1', 'report-1', 3);
    expect(twilio.sendGuardianReportNotification).toHaveBeenCalledTimes(1);
  });
});

describe('Guardian notification HTTP authorization and validation', () => {
  let app: INestApplication;
  let fixture: ReturnType<typeof setup>;
  let capabilities: string[];

  beforeEach(async () => {
    fixture = setup();
    capabilities = ['booking.view', 'booking.manage'];
    fixture.prisma.agencyMembership.findUnique.mockImplementation(async () => ({
      capabilities,
    }));
    const module = await Test.createTestingModule({
      controllers: [GuardianNotificationsController],
      providers: [
        GuardianNotificationsService,
        { provide: PrismaService, useValue: fixture.prisma },
        { provide: TwilioService, useValue: fixture.twilio },
        { provide: ConfigService, useValue: fixture.config },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: 'staff-1',
            agencyId: req.headers['x-test-agency'] || 'agency-1',
            role: 'AGENT',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    await app.listen(0, '127.0.0.1');
  });
  afterEach(async () => {
    await app.close();
  });

  it('rejects missing communication capability on preview and send', async () => {
    capabilities = ['booking.view'];
    await request(app.getHttpServer())
      .get('/guardian/staff/reports/report-1/notifications/whatsapp')
      .expect(403);
    await request(app.getHttpServer())
      .post('/guardian/staff/reports/report-1/notifications/whatsapp')
      .send({ revision: 3 })
      .expect(403);
    expect(
      fixture.twilio.sendGuardianReportNotification,
    ).not.toHaveBeenCalled();
  });

  it('returns 404 for a foreign tenant and rejects browser-supplied destinations', async () => {
    await request(app.getHttpServer())
      .post('/guardian/staff/reports/report-1/notifications/whatsapp')
      .set('x-test-agency', 'foreign')
      .send({ revision: 3 })
      .expect(404);
    await request(app.getHttpServer())
      .post('/guardian/staff/reports/report-1/notifications/whatsapp')
      .send({ revision: 3, to: '+212699999999' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/guardian/staff/reports/report-1/notifications/whatsapp')
      .send({ revision: 0 })
      .expect(400);
    expect(
      fixture.twilio.sendGuardianReportNotification,
    ).not.toHaveBeenCalled();
  });

  it('requires explicit POST and returns truthful provider acknowledgement', async () => {
    await request(app.getHttpServer())
      .get('/guardian/staff/reports/report-1/notifications/whatsapp')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({ state: 'READY', recipient: '••••5678' }),
      );
    expect(
      fixture.twilio.sendGuardianReportNotification,
    ).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/guardian/staff/reports/report-1/notifications/whatsapp')
      .send({ revision: 3 })
      .expect(201)
      .expect(({ body }) => {
        expect(body.state).toBe('PROVIDER_ACCEPTED');
        expect(body).not.toHaveProperty('delivered');
      });
  });
});
