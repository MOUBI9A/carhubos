import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, UpdateBookingDto } from './dto/bookings.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { PdfEngineService } from '../pdf-engine/pdf-engine.service';
import { TrustService } from '../trust/trust.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private webhooks: WebhooksService,
    private pdfEngine: PdfEngineService,
    private trust: TrustService,
    private entitlements: EntitlementsService,
  ) {}

  async create(
    agencyId: string,
    createBookingDto: CreateBookingDto,
    actorId: string,
  ) {
    // SaaS gates: block suspended tenants, then enforce the plan's monthly
    // booking quota (no-op on unlimited/BETA plans).
    await this.entitlements.assertOperating(agencyId);
    await this.entitlements.assertWithinLimit(agencyId, 'bookings');

    const { carId, customerId, startDate, endDate } = createBookingDto;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Check if car exists and belongs to agency
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      include: { documents: true },
    });
    if (!car) {
      throw new NotFoundException('Car not found');
    }

    // 2. THE GUARDIAN: Hard Lock Check
    // A car cannot be booked if it has EXPIRED mandatory documents
    const expiredMandatoryDoc = car.documents.find(
      (doc) =>
        doc.isMandatory &&
        (doc.status === 'EXPIRED' || new Date(doc.expiryDate) < new Date()),
    );

    if (expiredMandatoryDoc) {
      // Logic BP Pillar A: Auto-log refusal if blocked by compliance
      await this.prisma.refusalLog.create({
        data: {
          agencyId,
          customerName: 'Attempted Booking',
          customerPhone: 'N/A',
          requestedCarType: car.brand,
          requestedStartDate: start,
          requestedEndDate: end,
          potentialRevenue: 0,
          status: 'LOST',
        },
      });
      throw new ForbiddenException(
        `Vehicle Hard-Locked: ${expiredMandatoryDoc.type} is expired.`,
      );
    }

    // 3. Check if customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, agencyId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // 3b. THE TRUST NETWORK: block renters carrying an active cross-agency
    // blacklist flag (CRITICAL/HIGH), unless a manager supplies an override
    // reason — which is written to the Audit Trail. Mirrors the Guardian lock.
    const blockingFlag = await this.trust.blockingFlagForCustomer(
      agencyId,
      customerId,
    );
    if (blockingFlag) {
      if (!createBookingDto.overrideReason) {
        await this.prisma.refusalLog.create({
          data: {
            agencyId,
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerPhone: customer.phone,
            requestedCarType: car.brand,
            requestedStartDate: start,
            requestedEndDate: end,
            potentialRevenue: 0,
            status: 'LOST',
          },
        });
        throw new ForbiddenException(
          `Renter Hard-Locked by the Trust Network: ${blockingFlag.reason} ` +
            `(flagged by ${(blockingFlag as any).agency?.name ?? 'another agency'}). ` +
            `Manager override required.`,
        );
      }
      // Override path — record who bypassed the network flag and why.
      await this.auditLogs.log(
        agencyId,
        actorId,
        'TRUST_OVERRIDE',
        'CUSTOMER',
        customerId,
        undefined,
        {
          flagId: blockingFlag.id,
          reason: blockingFlag.reason,
          overrideReason: createBookingDto.overrideReason,
        },
      );
    }

    // 4. Validate dates
    if (start >= end) {
      throw new BadRequestException('End date must be after start date');
    }

    // 5. Check for overlaps
    // A REQUESTED booking still reserves the car for these dates — it must
    // block conflicting requests, not just APPROVED/ACTIVE ones, otherwise
    // two pending requests for the same dates can both later be approved.
    // TODO(Phase 2): add DB-level overlap exclusion constraint on Postgres
    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        carId,
        status: { in: ['REQUESTED', 'APPROVED', 'ACTIVE', 'OVERDUE'] },
        OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
      },
    });

    if (overlappingBooking) {
      // LOG REFUSAL: capture demand for full fleet
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      await this.prisma.refusalLog.create({
        data: {
          agencyId,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerPhone: customer.phone,
          requestedCarType: car.brand,
          requestedStartDate: start,
          requestedEndDate: end,
          // pricePerDay is Prisma.Decimal — keep the multiply in Decimal space.
          potentialRevenue: car.pricePerDay.times(diffDays),
          status: 'WAITING',
        },
      });
      throw new BadRequestException(
        'Car is already booked for these dates. Added to waitlist.',
      );
    }

    // 6. Calculate total price
    // car.pricePerDay is a Prisma.Decimal — the whole price/VAT chain stays in
    // Decimal space so we never round-trip money through binary float.
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalPrice = car.pricePerDay.times(diffDays);

    // 7. Create booking, invoice, and initial PENDING payment in a transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          startDate: start,
          endDate: end,
          totalPrice,
          agencyId,
          carId,
          customerId,
          status: 'REQUESTED',
        },
      });

      // VAT is INCLUSIVE (founder decision): totalPrice is the gross the renter
      // pays; taxAmount is the 20% VAT *embedded* in it = total × 20/120.
      // The invoice/payment total stays == totalPrice (VAT is not added on top).
      const taxAmount = totalPrice.times(20).dividedBy(120).toDecimalPlaces(2);
      const invoice = await tx.invoice.create({
        data: {
          amount: totalPrice,
          taxAmount,
          agencyId,
          bookingId: b.id,
          status: 'DUE',
        },
      });

      // Triple-Link: Create the first pending payment record
      await tx.payment.create({
        data: {
          amount: totalPrice,
          status: 'PENDING',
          type: 'INCOME',
          method: 'CASH', // Default for triple-link, can be updated by agent
          invoiceId: invoice.id,
        }
      });

      return b;
    });

    // 8. FORENSIC AUDIT
    await this.auditLogs.log(
      agencyId,
      actorId,
      'CREATE_BOOKING',
      'BOOKING',
      booking.id,
      null,
      booking,
    );

    // 9. TRIGGER WEBHOOK
    await this.webhooks.trigger(agencyId, 'BOOKING_CREATED', booking);

    return booking;
  }

  async findAll(agencyId: string) {
    return this.prisma.booking.findMany({
      where: { agencyId },
      include: { car: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(agencyId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, agencyId },
      include: { car: true, customer: true, invoices: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  /** Legal lifecycle transitions — terminal states cannot be reopened. */
  private static readonly STATUS_TRANSITIONS: Record<string, string[]> = {
    REQUESTED: ['APPROVED', 'CANCELLED'],
    APPROVED: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['OVERDUE', 'COMPLETED'],
    OVERDUE: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  async updateStatus(agencyId: string, id: string, status: string, actorId: string) {
    const booking = await this.findOne(agencyId, id);

    const allowed = BookingsService.STATUS_TRANSITIONS[booking.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        allowed.length === 0
          ? `Booking is ${booking.status} — a terminal state that cannot be changed.`
          : `Illegal transition ${booking.status} → ${status}. Allowed: ${allowed.join(', ')}.`,
      );
    }

    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      // Re-check for a conflicting booking INSIDE the transaction before
      // flipping to APPROVED/ACTIVE. Closes the check-then-act race where
      // two overlapping REQUESTED bookings for the same car both get
      // approved concurrently.
      // TODO(Phase 2): add DB-level overlap exclusion constraint on Postgres
      if (status === 'APPROVED' || status === 'ACTIVE') {
        const conflictingBooking = await tx.booking.findFirst({
          where: {
            carId: booking.carId,
            id: { not: booking.id },
            status: { in: ['REQUESTED', 'APPROVED', 'ACTIVE', 'OVERDUE'] },
            OR: [
              {
                startDate: { lte: booking.endDate },
                endDate: { gte: booking.startDate },
              },
            ],
          },
        });
        if (conflictingBooking) {
          throw new ConflictException(
            'Car is already booked for overlapping dates by another booking.',
          );
        }
      }

      // Sync the vehicle's status with the rental lifecycle
      if (status === 'ACTIVE') {
        await tx.car.update({
          where: { id: booking.carId },
          data: { status: 'RENTED' },
        });
      } else if (status === 'COMPLETED' || status === 'CANCELLED') {
        // Only release the car if it is actually out with this rental —
        // never stomp a MAINTENANCE / OUT_OF_SERVICE flag set by the workshop.
        await tx.car.updateMany({
          where: { id: booking.carId, status: 'RENTED' },
          data: { status: 'AVAILABLE' },
        });
      }

      return tx.booking.update({
        where: { id },
        data: { status },
      });
    });

    // BP Pillar C: Forensic audit of status change
    await this.auditLogs.log(
      agencyId,
      actorId,
      'UPDATE_BOOKING_STATUS',
      'BOOKING',
      id,
      { oldStatus: booking.status },
      { newStatus: status }
    );

    // TRIGGER WEBHOOK
    await this.webhooks.trigger(agencyId, 'BOOKING_STATUS_UPDATED', updatedBooking);

    return updatedBooking;
  }

  async generateContractPdf(agencyId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, agencyId },
      include: {
        car: true,
        customer: true,
        agency: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Prepare default data for missing fields if any
    const enrichedBooking = {
      ...booking,
      depositAmount: (booking as any).depositAmount || 0,
    };

    return this.pdfEngine.generateContract(enrichedBooking);
  }
}
