import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './dto/customers.dto';

/** Claim-invite links stay valid for 14 days before staff need to re-issue one. */
const INVITE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async create(agencyId: string, createCustomerDto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { agencyId, identityNumber: createCustomerDto.identityNumber },
    });
    if (existing) {
      throw new ConflictException(
        'Customer with this identity number already exists in your agency',
      );
    }

    return this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        agencyId,
      },
    });
  }

  /**
   * Directory list — booking counts included so the UI can rank activity.
   *
   * Backward compatible: with no page/limit it returns the bare array
   * exactly as before. When page or limit is provided it returns a
   * paginated envelope { items, total, page, limit }.
   */
  async findAll(agencyId: string, query: ListCustomersQueryDto = {}) {
    const { page, limit, search } = query;

    const where: Prisma.CustomerWhereInput = { agencyId };
    if (search) {
      // Postgres 'contains' is case-sensitive by default — mode:'insensitive'
      // on the name fields so e.g. "amine" still finds "Amine" (previously
      // missed on this DB; the stale comment above claimed SQLite behavior
      // this app hasn't run on since Phase 2). phone is numeric — no case to
      // fold, matching search.service.ts's own precedent for the same field.
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const listArgs = {
      where,
      include: {
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    } satisfies Prisma.CustomerFindManyArgs;

    // Legacy shape — bare array — when pagination isn't requested. Capped
    // (P2 backlog: this was the one unbounded default path), not paginated,
    // so the existing flat-array consumers (useCustomers/useBookings on the
    // frontend) are unchanged; callers who need the whole directory can
    // still opt into the paginated envelope below.
    if (page === undefined && limit === undefined) {
      return this.prisma.customer.findMany({ ...listArgs, take: 500 });
    }

    const currentPage = page ?? 1;
    const pageSize = limit ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        ...listArgs,
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page: currentPage, limit: pageSize };
  }

  /**
   * Customer profile — rental history (with vehicle context), identity
   * documents, and lifetime verified spend for the CRM detail page.
   */
  async findOne(agencyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, agencyId },
      include: {
        bookings: {
          orderBy: { createdAt: 'desc' },
          include: {
            car: {
              select: { id: true, brand: true, model: true, licensePlate: true },
            },
          },
        },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Lifetime verified cash collected from this customer (strict ERP)
    const spendAgg = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        type: 'INCOME',
        status: 'VERIFIED',
        invoice: { booking: { customerId: id } },
      },
    });

    return {
      ...customer,
      lifetimeSpend: spendAgg._sum.amount ?? 0,
    };
  }

  async update(
    agencyId: string,
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    // Lean ownership check — findOne would drag full history into memory
    const existing = await this.prisma.customer.findFirst({
      where: { id, agencyId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Customer not found');
    }
    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  async remove(agencyId: string, id: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, agencyId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Customer not found');
    }
    try {
      return await this.prisma.customer.delete({
        where: { id },
      });
    } catch (err) {
      // Booking FK is onDelete: Restrict — protect rental/financial history
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new ConflictException(
          'This customer has rental history and cannot be deleted. Blacklist them instead to block future bookings.',
        );
      }
      throw err;
    }
  }

  /** Mark a customer as BLACKLISTED and write a forensic audit entry. */
  async blacklist(
    agencyId: string,
    customerId: string,
    reason: string,
    actorId: string,
  ) {
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, agencyId },
    });
    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { status: 'BLACKLISTED' },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      'BLACKLIST_CUSTOMER',
      'CUSTOMER',
      customerId,
      { status: existing.status },
      { status: 'BLACKLISTED', reason },
    );

    return updated;
  }

  /** Reinstate a BLACKLISTED customer to ACTIVE status. */
  async unblacklist(agencyId: string, customerId: string, actorId: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, agencyId },
    });
    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { status: 'ACTIVE' },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      'UNBLACKLIST_CUSTOMER',
      'CUSTOMER',
      customerId,
      { status: existing.status },
      { status: 'ACTIVE' },
    );

    return updated;
  }

  /** Returns every customer currently on the agency blacklist. */
  async getBlacklisted(agencyId: string) {
    return this.prisma.customer.findMany({
      where: { agencyId, status: 'BLACKLISTED' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Generate a single-use, expiring claim link for a Customer that isn't
   * linked to a portal account yet. Staff share the link (WhatsApp/SMS/
   * email — no automated send wired here); the renter's own
   * POST /portal/claim-invite consumes it. A still-live (unconsumed,
   * unexpired) invite for the same customer is reused instead of minting a
   * new one, so repeated clicks don't pile up dead tokens.
   */
  async createInvite(agencyId: string, customerId: string, actorId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, agencyId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (customer.userId) {
      throw new ConflictException(
        'This client is already linked to a portal account.',
      );
    }

    const now = new Date();
    const live = await this.prisma.customerInvite.findFirst({
      where: { customerId, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (live) return live;

    const invite = await this.prisma.customerInvite.create({
      data: {
        token: randomBytes(32).toString('hex'),
        agencyId,
        customerId,
        createdByUserId: actorId,
        expiresAt: new Date(now.getTime() + INVITE_WINDOW_MS),
      },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      'CREATE_CUSTOMER_INVITE',
      'CUSTOMER',
      customerId,
      null,
      { inviteId: invite.id, expiresAt: invite.expiresAt },
    );

    return invite;
  }
}
