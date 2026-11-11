import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioService } from '../integrations/twilio/twilio.service';
import { GuardianNotificationsService } from './guardian-notifications.service';

const databaseUrl = process.env.GUARDIAN_TEST_DATABASE_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '55432' ||
    url.pathname !== '/guardian_e2e' ||
    url.username !== 'guardian_test'
  )
    throw new Error(
      'Guardian integration tests require the dedicated local guardian_e2e database.',
    );
}

/** Opt-in only. Every fixture and cleanup predicate uses generated IDs owned by this suite. */
(databaseUrl ? describe : describe.skip)(
  'Guardian notification Postgres concurrency',
  () => {
    let db: PrismaClient;
    let ids: {
      agency: string;
      user: string;
      car: string;
      customer: string;
      booking: string;
      report: string;
    };
    let twilio: {
      guardianWhatsAppAvailability: jest.Mock;
      sendGuardianReportNotification: jest.Mock;
    };
    let config: ConfigService;
    let service: GuardianNotificationsService;

    beforeAll(async () => {
      db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
      await db.$connect();
    });
    afterAll(async () => {
      await db?.$disconnect();
    });

    beforeEach(async () => {
      ids = {
        agency: randomUUID(),
        user: randomUUID(),
        car: randomUUID(),
        customer: randomUUID(),
        booking: randomUUID(),
        report: randomUUID(),
      };
      await db.$transaction(async (tx) => {
        await tx.agency.create({
          data: {
            id: ids.agency,
            name: 'Guardian notification test',
            contactEmail: `${ids.agency}@guardian-notification.test`,
          },
        });
        await tx.user.create({
          data: {
            id: ids.user,
            email: `${ids.user}@guardian-notification.test`,
            password: 'not-a-login-hash',
            name: 'Notification test renter',
            role: 'RENTER',
          },
        });
        await tx.customer.create({
          data: {
            id: ids.customer,
            agencyId: ids.agency,
            firstName: 'Guardian',
            lastName: 'Renter',
            phone: '0612345678',
            identityNumber: ids.customer,
            userId: ids.user,
          },
        });
        await tx.car.create({
          data: {
            id: ids.car,
            agencyId: ids.agency,
            brand: 'Test',
            model: 'Guardian',
            year: 2026,
            licensePlate: ids.car,
            pricePerDay: 100,
          },
        });
        await tx.booking.create({
          data: {
            id: ids.booking,
            agencyId: ids.agency,
            customerId: ids.customer,
            renterId: ids.user,
            carId: ids.car,
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            totalPrice: 100,
          },
        });
        await tx.guardianReport.create({
          data: {
            id: ids.report,
            agencyId: ids.agency,
            bookingId: ids.booking,
            carId: ids.car,
            phase: 'OUT',
            mode: 'QUICK',
            mileage: 100,
            fuelLevel: 50,
            createdById: 'notification-test-staff',
            status: 'CUSTOMER_REVIEW',
            revision: 2,
            agencyApprovedRevision: 2,
            publishedAt: new Date(),
          },
        });
      });
      twilio = {
        guardianWhatsAppAvailability: jest
          .fn()
          .mockReturnValue({ state: 'READY' }),
        sendGuardianReportNotification: jest
          .fn()
          .mockResolvedValue({
            state: 'PROVIDER_ACCEPTED',
            message: 'Mock provider accepted; no real send.',
            providerSid: 'SM-integration-mocked',
            providerStatus: 'queued',
          }),
      };
      config = {
        get: () => 'https://portal.example.test',
      } as unknown as ConfigService;
      service = new GuardianNotificationsService(
        db as PrismaService,
        twilio as unknown as TwilioService,
        config,
      );
    });

    afterEach(async () => {
      await db.$transaction(async (tx) => {
        await tx.guardianEvent.deleteMany({ where: { reportId: ids.report } });
        await tx.guardianReport.deleteMany({
          where: { id: ids.report, agencyId: ids.agency },
        });
        await tx.booking.deleteMany({
          where: { id: ids.booking, agencyId: ids.agency },
        });
        await tx.customer.deleteMany({
          where: { id: ids.customer, agencyId: ids.agency },
        });
        await tx.car.deleteMany({
          where: { id: ids.car, agencyId: ids.agency },
        });
        await tx.user.deleteMany({ where: { id: ids.user } });
        await tx.agency.deleteMany({ where: { id: ids.agency } });
      });
    });

    it('commits one reservation and performs one mocked provider request for concurrent real row locks', async () => {
      const results = await Promise.all([
        service.send(ids.agency, 'staff-1', ids.report, 2),
        service.send(ids.agency, 'staff-1', ids.report, 2),
        service.send(ids.agency, 'staff-1', ids.report, 2),
      ]);
      expect(twilio.sendGuardianReportNotification).toHaveBeenCalledTimes(1);
      expect(results.filter((r) => r.duplicate)).toHaveLength(2);
      expect(
        await db.guardianEvent.count({
          where: {
            reportId: ids.report,
            action: 'WHATSAPP_NOTIFICATION_ATTEMPT',
          },
        }),
      ).toBe(1);
      expect(
        await db.guardianEvent.count({
          where: {
            reportId: ids.report,
            action: 'WHATSAPP_NOTIFICATION_RESULT',
          },
        }),
      ).toBe(1);
    });

    it('retains a failed uncertain outcome across service restart and never silently retries', async () => {
      twilio.sendGuardianReportNotification.mockResolvedValue({
        state: 'FAILED',
        message: 'Mock timeout.',
        acceptanceUnknown: true,
      });
      await service.send(ids.agency, 'staff-1', ids.report, 2);
      const restarted = new GuardianNotificationsService(
        db as PrismaService,
        twilio as unknown as TwilioService,
        config,
      );
      expect(
        await restarted.send(ids.agency, 'staff-2', ids.report, 2),
      ).toMatchObject({
        state: 'FAILED',
        duplicate: true,
        acceptanceUnknown: true,
      });
      expect(twilio.sendGuardianReportNotification).toHaveBeenCalledTimes(1);
    });

    it('does not send if a process previously stopped after reserving the request', async () => {
      await db.guardianEvent.create({
        data: {
          reportId: ids.report,
          revision: 2,
          actorId: 'prior-process',
          actorRole: 'AGENCY',
          action: 'WHATSAPP_NOTIFICATION_ATTEMPT',
          details: {},
        },
      });
      expect(
        await service.send(ids.agency, 'staff-1', ids.report, 2),
      ).toMatchObject({ state: 'IN_PROGRESS', duplicate: true });
      expect(twilio.sendGuardianReportNotification).not.toHaveBeenCalled();
    });

    it('returns not-found for a foreign tenant and records no send event', async () => {
      await expect(
        service.send(randomUUID(), 'staff-1', ids.report, 2),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(twilio.sendGuardianReportNotification).not.toHaveBeenCalled();
      expect(
        await db.guardianEvent.count({ where: { reportId: ids.report } }),
      ).toBe(0);
    });
  },
);
