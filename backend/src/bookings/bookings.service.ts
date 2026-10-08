import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, UpdateBookingDto } from './dto/bookings.dto';
import { UpdateDepositDto, CaptureDepositDto } from './dto/deposit.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { PdfEngineService } from '../pdf-engine/pdf-engine.service';
import { TrustService } from '../trust/trust.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { AutomationEngine } from '../automations/automation-engine.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private webhooks: WebhooksService,
    private pdfEngine: PdfEngineService,
    private trust: TrustService,
    private entitlements: EntitlementsService,
    // Optional so the manual-construction unit specs (which pass the 6 deps
    // above) keep compiling; Nest always injects it in the app since
    // BookingsModule imports AutomationsModule.
    private automationEngine?: AutomationEngine,
  ) {}

  /** Prisma wraps PostgreSQL 23P01 differently across engine versions. */
  private rethrowBookingConflict(error: unknown): never {
    const detail =
      error instanceof Error
        ? `${error.message} ${JSON.stringify((error as { meta?: unknown }).meta ?? {})}`
        : '';
    if (
      detail.includes('booking_active_car_dates_excl') &&
      (detail.includes('23P01') || /exclusion constraint/i.test(detail))
    ) {
      throw new ConflictException(
        'Car is already booked for overlapping dates by another booking.',
      );
    }
    // Never disguise connectivity, authorization, foreign-key or other errors.
    throw error;
  }

  async create(
    agencyId: string,
    createBookingDto: CreateBookingDto,
    actorId: string,
  ) {
    // SaaS gates: block suspended tenants, then enforce the plan's monthly
    // booking quota (no-op on unlimited/BETA plans).
    await this.entitlements.assertOperating(agencyId);
    await this.entitlements.assertWithinLimit(agencyId, 'bookings');

    const { carId, customerId, startDate, endDate, depositAmount, depositMethod } =
      createBookingDto;
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
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      throw new BadRequestException('Booking dates must be valid timestamps');
    }
    if (start >= end) {
      throw new BadRequestException('End date must be after start date');
    }

    // 5. Check for overlaps
    // A REQUESTED booking still reserves the car for these dates — it must
    // block conflicting requests, not just APPROVED/ACTIVE ones, otherwise
    // two pending requests for the same dates can both later be approved.
    // PostgreSQL booking_active_car_dates_excl arbitrates concurrent requests.
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
      const deposit = new Prisma.Decimal(depositAmount ?? 0).toDecimalPlaces(2);
      if (deposit.lt(0)) {
        throw new BadRequestException('depositAmount cannot be negative.');
      }

      const b = await tx.booking.create({
        data: {
          startDate: start,
          endDate: end,
          totalPrice,
          depositAmount: deposit,
          depositMethod: depositMethod ?? 'CASH',
          // Deposit starts PENDING until hand-over (ACTIVE) holds it.
          depositStatus: 'PENDING',
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
    }).catch((error: unknown) => this.rethrowBookingConflict(error));

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

    // 10. Fire this agency's BOOKING_CREATED automation rules (persisted user
    // rules; safe actions only, never throws — see AutomationEngine.runTrigger).
    await this.automationEngine?.runTrigger(agencyId, 'BOOKING_CREATED', {
      subject: booking.id.slice(0, 8),
      detail: `New booking ${booking.id} created.`,
    });

    return booking;
  }

  /**
   * `status`/`from`/`to`/`page`/`pageSize` are all optional and additive — when
   * none are supplied this returns the same flat array as before (existing
   * frontend callers are unaffected). Passing them moves filtering/paging from
   * in-memory JS to the SQL query, which is the actual perf fix.
   *
   * `from`/`to` use **overlap** semantics (not "starts-within"): a booking is
   * returned when it intersects the window, i.e. `startDate <= to AND
   * endDate >= from`. This is what a date-range UI like the scheduler grid needs
   * — a rental that began before `from` but is still running must still appear,
   * not be dropped. The owner scheduler now fetches only its visible window.
   */
  async findAll(
    agencyId: string,
    query?: { status?: string; from?: string; to?: string; page?: number; pageSize?: number },
  ) {
    const where: Prisma.BookingWhereInput = { agencyId };
    if (query?.status) where.status = query.status;
    // Overlap window: keep every booking that intersects [from, to], including
    // ones that started before `from` and are still running (endDate >= from).
    if (query?.to) where.startDate = { lte: new Date(query.to) };
    if (query?.from) where.endDate = { gte: new Date(query.from) };

    const paginate = query?.page !== undefined || query?.pageSize !== undefined;
    const page = Math.max(1, query?.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query?.pageSize ?? 25));

    const findManyArgs: Prisma.BookingFindManyArgs = {
      where,
      include: {
        car: true,
        customer: true,
        // Finance UI needs invoice ids/status for partial payment recording.
        invoices: { select: { id: true, amount: true, status: true, taxAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    };

    if (!paginate) {
      return this.prisma.booking.findMany(findManyArgs);
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({ ...findManyArgs, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total, page, pageSize };
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

    const { updated: updatedBooking, lateFee } = await this.prisma.$transaction(async (tx) => {
      // Keep the friendly pre-check; the PostgreSQL exclusion constraint
      // arbitrates concurrent writes, including direct database writes.
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

      // Hand-over: auto-hold any captured security deposit (PENDING → HELD).
      const depositPatch: Prisma.BookingUpdateInput = { status };
      if (
        status === 'ACTIVE' &&
        booking.depositStatus === 'PENDING' &&
        booking.depositAmount.gt(0)
      ) {
        depositPatch.depositStatus = 'HELD';
      }

      const updated = await tx.booking.update({
        where: { id },
        data: depositPatch,
      });

      // Late fee: an OVERDUE booking being closed out is charged for every day
      // past its scheduled return, at the car's own daily rate — a real rate
      // already on the booking, never an invented number. Attached as an
      // INCOME payment on the latest invoice, same reconciliation pattern used
      // everywhere else in this codebase (integer cents, tx-scoped). Audit log
      // happens after the transaction commits (see below), matching this
      // method's own existing UPDATE_BOOKING_STATUS pattern.
      let lateFee: { daysLate: number; amount: Prisma.Decimal; invoiceId: string } | null = null;
      if (booking.status === 'OVERDUE' && status === 'COMPLETED') {
        const daysLate = Math.max(
          1,
          Math.ceil((Date.now() - booking.endDate.getTime()) / 86_400_000),
        );
        const latestInvoice = await tx.invoice.findFirst({
          where: { bookingId: id },
          orderBy: { createdAt: 'desc' },
        });
        if (latestInvoice) {
          const lateFeeAmount = booking.car.pricePerDay
            .times(daysLate)
            .toDecimalPlaces(2);

          await tx.payment.create({
            data: {
              amount: lateFeeAmount,
              type: 'INCOME',
              method: 'CASH',
              status: 'VERIFIED',
              reference: `Late fee — ${daysLate} day${daysLate === 1 ? '' : 's'} overdue @ ${booking.car.pricePerDay.toFixed(2)} MAD/day`.slice(0, 500),
              verifiedById: actorId,
              date: new Date(),
              invoiceId: latestInvoice.id,
            },
          });

          const totalCents = latestInvoice.amount.times(100).toNumber();
          const [incomeAgg, refundAgg] = await Promise.all([
            tx.payment.aggregate({
              where: { invoiceId: latestInvoice.id, status: 'VERIFIED', type: 'INCOME' },
              _sum: { amount: true },
            }),
            tx.payment.aggregate({
              where: { invoiceId: latestInvoice.id, status: 'VERIFIED', type: 'REFUND' },
              _sum: { amount: true },
            }),
          ]);
          const incomeCents = (incomeAgg._sum.amount ?? new Prisma.Decimal(0)).times(100).toNumber();
          const refundCents = (refundAgg._sum.amount ?? new Prisma.Decimal(0)).times(100).toNumber();
          const paidCents = incomeCents - refundCents;
          await tx.invoice.update({
            where: { id: latestInvoice.id },
            data: {
              status: paidCents >= totalCents ? 'PAID' : paidCents > 0 ? 'PARTIAL' : 'DUE',
            },
          });

          lateFee = { daysLate, amount: lateFeeAmount, invoiceId: latestInvoice.id };
        }
      }

      return { updated, lateFee };
    }).catch((error: unknown) => this.rethrowBookingConflict(error));

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

    if (lateFee) {
      await this.auditLogs.log(
        agencyId,
        actorId,
        'LATE_FEE_CHARGE',
        'BOOKING',
        id,
        { endDate: booking.endDate },
        {
          daysLate: lateFee.daysLate,
          amount: lateFee.amount.toNumber(),
          invoiceId: lateFee.invoiceId,
        },
      );
    }

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
      depositAmount: booking.depositAmount || 0,
    };

    return this.pdfEngine.generateContract(enrichedBooking);
  }

  /**
   * Capture (set amount) a security deposit while still PENDING.
   * Used when deposit was 0 at booking create and is collected later at contract.
   */
  async captureDeposit(
    agencyId: string,
    bookingId: string,
    actorId: string,
    dto: CaptureDepositDto,
  ) {
    const booking = await this.findOne(agencyId, bookingId);
    if (booking.depositStatus !== 'PENDING') {
      throw new ConflictException(
        `Cannot capture deposit while status is ${booking.depositStatus}.`,
      );
    }
    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      throw new ConflictException('Cannot capture deposit on a closed booking.');
    }

    const amount = new Prisma.Decimal(dto.amount).toDecimalPlaces(2);
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        depositAmount: amount,
        depositMethod: dto.method ?? booking.depositMethod,
        depositStatus: 'PENDING',
      },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      'CAPTURE_DEPOSIT',
      'BOOKING',
      bookingId,
      { depositAmount: booking.depositAmount, depositStatus: booking.depositStatus },
      { depositAmount: amount, depositStatus: 'PENDING' },
    );

    return updated;
  }

  /**
   * Deposit lifecycle transitions:
   *   HOLD   — PENDING → HELD (hand-over capture)
   *   RETURN — HELD → RETURNED (full release; no payment row — deposit is off-books)
   *   CLAIM  — HELD → CLAIMED + optional damage INCOME on the invoice
   */
  async updateDeposit(
    agencyId: string,
    bookingId: string,
    actorId: string,
    dto: UpdateDepositDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
      include: {
        invoices: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const before = {
      depositStatus: booking.depositStatus,
      depositAmount: booking.depositAmount,
      depositMethod: booking.depositMethod,
    };

    if (dto.action === 'HOLD') {
      if (booking.depositStatus !== 'PENDING') {
        throw new ConflictException(
          `HOLD requires depositStatus PENDING (got ${booking.depositStatus}).`,
        );
      }
      if (!booking.depositAmount.gt(0)) {
        throw new BadRequestException(
          'Cannot hold a zero deposit — capture an amount first.',
        );
      }
      const updated = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          depositStatus: 'HELD',
          ...(dto.method ? { depositMethod: dto.method } : {}),
        },
      });
      await this.auditLogs.log(
        agencyId,
        actorId,
        'HOLD_DEPOSIT',
        'BOOKING',
        bookingId,
        before,
        { depositStatus: 'HELD', note: dto.note },
      );
      return updated;
    }

    if (dto.action === 'RETURN') {
      if (booking.depositStatus !== 'HELD') {
        throw new ConflictException(
          `RETURN requires depositStatus HELD (got ${booking.depositStatus}).`,
        );
      }
      const updated = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { depositStatus: 'RETURNED' },
      });
      await this.auditLogs.log(
        agencyId,
        actorId,
        'RETURN_DEPOSIT',
        'BOOKING',
        bookingId,
        before,
        { depositStatus: 'RETURNED', note: dto.note },
      );
      return updated;
    }

    // CLAIM
    if (booking.depositStatus !== 'HELD') {
      throw new ConflictException(
        `CLAIM requires depositStatus HELD (got ${booking.depositStatus}).`,
      );
    }

    const claimExtra = new Prisma.Decimal(dto.claimAmount ?? 0).toDecimalPlaces(2);
    if (claimExtra.lt(0)) {
      throw new BadRequestException('claimAmount cannot be negative.');
    }

    const invoice = booking.invoices[0];
    const updated = await this.prisma.$transaction(async (tx) => {
      // Compound-`where` guard closes the check-then-act race: the outer
      // `depositStatus !== 'HELD'` check above reads via `this.prisma`
      // before this transaction opens, so two concurrent CLAIM calls can
      // both pass it before either commits. Re-asserting `depositStatus:
      // 'HELD'` in the update's own `where` means only the FIRST to commit
      // actually flips the row; a loser's `updateMany` matches zero rows
      // and aborts here — before it ever creates a claimExtra payment —
      // instead of both racers each booking their own damage charge.
      const claimResult = await tx.booking.updateMany({
        where: { id: bookingId, depositStatus: 'HELD' },
        data: { depositStatus: 'CLAIMED' },
      });
      if (claimResult.count === 0) {
        throw new ConflictException(
          'CLAIM requires depositStatus HELD — this deposit was already updated by another request.',
        );
      }
      const b = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });

      // Optional extra damage charge beyond the forfeited deposit — booked as
      // verified INCOME so invoice reconciliation reflects the real total due.
      // The deposit itself is retained off-invoice (agency keeps the caution).
      if (claimExtra.gt(0) && invoice) {
        await tx.payment.create({
          data: {
            amount: claimExtra,
            type: 'INCOME',
            method: booking.depositMethod || 'CASH',
            status: 'VERIFIED',
            reference: dto.note
              ? `DEPOSIT_CLAIM:${dto.note}`.slice(0, 120)
              : 'DEPOSIT_CLAIM',
            verifiedById: actorId,
            date: new Date(),
            invoiceId: invoice.id,
          },
        });

        // Reconcile: net verified income vs invoice amount (integer cents).
        const totalCents = invoice.amount.times(100).toNumber();
        const [incomeAgg, refundAgg] = await Promise.all([
          tx.payment.aggregate({
            where: { invoiceId: invoice.id, status: 'VERIFIED', type: 'INCOME' },
            _sum: { amount: true },
          }),
          tx.payment.aggregate({
            where: { invoiceId: invoice.id, status: 'VERIFIED', type: 'REFUND' },
            _sum: { amount: true },
          }),
        ]);
        const incomeCents = (incomeAgg._sum.amount ?? new Prisma.Decimal(0))
          .times(100)
          .toNumber();
        const refundCents = (refundAgg._sum.amount ?? new Prisma.Decimal(0))
          .times(100)
          .toNumber();
        const paidCents = incomeCents - refundCents;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status:
              paidCents >= totalCents ? 'PAID' : paidCents > 0 ? 'PARTIAL' : 'DUE',
          },
        });
      }

      return b;
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      'CLAIM_DEPOSIT',
      'BOOKING',
      bookingId,
      before,
      {
        depositStatus: 'CLAIMED',
        claimAmount: claimExtra,
        note: dto.note,
      },
    );

    return updated;
  }
}
