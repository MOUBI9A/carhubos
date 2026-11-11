import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import {
  GuardianWhatsAppResult,
  TwilioService,
} from '../integrations/twilio/twilio.service';
import { PrismaService } from '../prisma/prisma.service';

const ATTEMPT = 'WHATSAPP_NOTIFICATION_ATTEMPT';
const RESULT = 'WHATSAPP_NOTIFICATION_RESULT';

type NotificationResult = Omit<GuardianWhatsAppResult, 'state'> & {
  state: GuardianWhatsAppResult['state'] | 'IN_PROGRESS';
  revision: number;
  recipient: string;
  duplicate?: boolean;
};

/** Accept international E.164 and common Moroccan local formatting; never guess other countries. */
export function guardianCustomerPhone(phone: string): string | null {
  if (typeof phone !== 'string' || !/^[+\d\s().-]+$/.test(phone)) return null;
  let value = phone.replace(/[\s().-]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  if (/^0[67]\d{8}$/.test(value)) value = `+212${value.slice(1)}`;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}

@Injectable()
export class GuardianNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly twilio: TwilioService,
    private readonly config: ConfigService,
  ) {}

  private async report(
    db: Prisma.TransactionClient,
    agencyId: string,
    id: string,
  ) {
    if (!agencyId) throw new NotFoundException('Inspection not found.');
    const report = await db.guardianReport.findFirst({
      where: { id, agencyId, status: { not: 'DRAFT' } },
      include: { booking: { include: { customer: true } }, agency: true },
    });
    if (
      !report ||
      report.booking.agencyId !== agencyId ||
      report.booking.customer.agencyId !== agencyId
    )
      throw new NotFoundException('Inspection not found.');
    if (!report.publishedAt)
      throw new ConflictException(
        'Publish the inspection before notifying the customer.',
      );
    if (!report.booking.renterId && !report.booking.customer.userId)
      throw new ConflictException(
        'Link the booking customer to a renter account first.',
      );
    if (
      report.booking.renterId &&
      report.booking.customer.userId &&
      report.booking.renterId !== report.booking.customer.userId
    )
      throw new ConflictException(
        'Resolve the conflicting booking renter and customer account before notifying.',
      );
    const recipient = guardianCustomerPhone(report.booking.customer.phone);
    if (!recipient)
      throw new BadRequestException(
        'The booking customer needs a valid international or Moroccan mobile phone number.',
      );
    return { report, recipient, masked: `••••${recipient.slice(-4)}` };
  }

  private portalLink(id: string): string | null {
    try {
      const base = new URL(this.config.get<string>('PUBLIC_APP_URL', ''));
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
      if (
        (base.protocol !== 'https:' && !(base.protocol === 'http:' && local)) ||
        base.username ||
        base.password ||
        base.search ||
        base.hash
      )
        return null;
      const portal = new URL('/portal/inspections', base.origin);
      portal.searchParams.set('reportId', id);
      return portal.toString();
    } catch {
      return null;
    }
  }

  async preview(agencyId: string, id: string) {
    const { masked } = await this.report(this.prisma, agencyId, id);
    const availability = this.twilio.guardianWhatsAppAvailability(agencyId);
    if (!this.portalLink(id))
      return {
        recipient: masked,
        state: 'UNCONFIGURED' as const,
        reason:
          'Configure a trusted PUBLIC_APP_URL for the authenticated renter portal.',
      };
    return { recipient: masked, ...availability };
  }

  async send(
    agencyId: string,
    actorId: string,
    id: string,
    revision: number,
  ): Promise<NotificationResult> {
    if (!actorId) throw new NotFoundException('Inspection not found.');
    // A durable reservation commits before the network request. Parallel requests and
    // uncertain provider outcomes cannot create a second live send for this revision.
    const reservation = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "GuardianReport" WHERE id = ${id} FOR UPDATE`;
      const { report, recipient, masked } = await this.report(tx, agencyId, id);
      if (report.revision !== revision)
        throw new ConflictException(
          'Refresh the report before notifying the customer.',
        );
      const previous = await tx.guardianEvent.findFirst({
        where: { reportId: id, revision, action: ATTEMPT },
        orderBy: { createdAt: 'desc' },
      });
      if (previous) {
        const completed = await tx.guardianEvent.findFirst({
          where: {
            reportId: id,
            revision,
            action: RESULT,
            details: { path: ['attemptId'], equals: previous.id },
          },
          orderBy: { createdAt: 'desc' },
        });
        const result = completed?.details as
          | Record<string, unknown>
          | undefined;
        return {
          duplicate: {
            ...((result?.outcome as GuardianWhatsAppResult | undefined) ?? {
              state: 'IN_PROGRESS' as const,
              message:
                'A provider attempt is reserved. Its outcome is pending or unknown; do not resend.',
            }),
            revision,
            recipient: masked,
            duplicate: true,
          },
        };
      }
      const portal = this.portalLink(id);
      const availability = this.twilio.guardianWhatsAppAvailability(agencyId);
      if (!portal || availability.state !== 'READY') {
        const outcome: GuardianWhatsAppResult = !portal
          ? {
              state: 'UNCONFIGURED',
              message:
                'Configure a trusted PUBLIC_APP_URL for the authenticated renter portal.',
            }
          : availability.state === 'SIMULATED'
            ? {
                state: 'SIMULATED',
                message:
                  'Simulation only. No request was sent to WhatsApp or Twilio.',
              }
            : { state: 'UNCONFIGURED', message: availability.reason! };
        await tx.guardianEvent.create({
          data: {
            reportId: id,
            revision,
            actorId,
            actorRole: 'AGENCY',
            action: RESULT,
            details: {
              outcome,
              recipientSha256: createHash('sha256')
                .update(recipient)
                .digest('hex'),
            },
          },
        });
        return { duplicate: { ...outcome, revision, recipient: masked } };
      }
      const attemptId = randomUUID();
      await tx.guardianEvent.create({
        data: {
          id: attemptId,
          reportId: id,
          revision,
          actorId,
          actorRole: 'AGENCY',
          action: ATTEMPT,
          details: {
            recipientSha256: createHash('sha256')
              .update(recipient)
              .digest('hex'),
          },
        },
      });
      return {
        attemptId,
        recipient,
        masked,
        variables: {
          '1': report.agency.name,
          '2': report.phase,
          '3': String(revision),
          '4': portal,
        },
      };
    });
    if (reservation.duplicate) return reservation.duplicate;
    const outcome = await this.twilio.sendGuardianReportNotification(
      agencyId,
      reservation.recipient,
      reservation.variables,
    );
    await this.prisma.guardianEvent.create({
      data: {
        reportId: id,
        revision,
        actorId,
        actorRole: 'AGENCY',
        action: RESULT,
        details: { attemptId: reservation.attemptId, outcome },
      },
    });
    return { ...outcome, revision, recipient: reservation.masked };
  }
}
