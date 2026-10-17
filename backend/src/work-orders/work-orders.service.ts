import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import { VerifyWorkOrderDto } from './dto/verify-work-order.dto';
import { assertValidTransition, WorkOrderStatus } from './work-order-state-machine';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly entitlements: EntitlementsService,
  ) {}

  private scope(agencyId: string) {
    if (!agencyId) {
      throw new ForbiddenException('An agency context is required');
    }
  }

  async findAll(
    agencyId: string,
    filters?: { status?: string; vehicleId?: string; assignedTechnicianId?: string },
  ) {
    this.scope(agencyId);
    return this.prisma.workOrder.findMany({
      where: {
        agencyId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.vehicleId ? { vehicleId: filters.vehicleId } : {}),
        ...(filters?.assignedTechnicianId
          ? { assignedTechnicianId: filters.assignedTechnicianId }
          : {}),
      },
      include: {
        vehicle: true,
        fleetCar: true,
        assignedTechnician: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getOperationalMetrics(agencyId: string) {
    this.scope(agencyId);
    await this.entitlements.assertOperating(agencyId);

    const [statusCounts, sessionsNeedingReview, openSessions] = await Promise.all([
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where: { agencyId },
        _count: { id: true },
      }),
      this.prisma.diagnosticSession.count({
        where: { agencyId, status: 'ANALYZED' },
      }),
      this.prisma.diagnosticSession.findMany({
        where: { agencyId, status: 'OPEN' },
        select: { data: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const item of statusCounts) {
      counts[item.status] = item._count.id;
    }

    const waitingVehicles = (counts['DRAFT'] || 0) + (counts['SCHEDULED'] || 0);
    const activeRepairs = counts['IN_PROGRESS'] || 0;
    const blockedJobs = (counts['WAITING_FOR_PARTS'] || 0) + (counts['BLOCKED'] || 0);
    const readyForQc = (counts['READY_FOR_QUALITY_CHECK'] || 0) + (counts['QUALITY_CHECK'] || 0);
    const awaitingApproval = counts['AWAITING_APPROVAL'] || 0;
    const completedThisMonth = (counts['COMPLETED'] || 0) + (counts['INVOICED'] || 0);

    let criticalIssuesCount = 0;
    for (const session of openSessions) {
      const data = session.data as any;
      if (data?.dtcs && Array.isArray(data.dtcs) && data.dtcs.length > 0) {
        criticalIssuesCount++;
      }
    }

    return {
      waitingVehicles,
      diagnosticsNeedingReview: sessionsNeedingReview,
      activeRepairs,
      blockedJobs,
      readyForQc,
      awaitingApproval,
      completedThisMonth,
      criticalIssuesCount,
    };
  }

  async findOne(agencyId: string, id: string) {
    this.scope(agencyId);
    const order = await this.prisma.workOrder.findUnique({
      where: { id_agencyId: { id, agencyId } },
      include: {
        vehicle: true,
        fleetCar: true,
        session: true,
        assignedTechnician: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    return order;
  }

  async create(agencyId: string, actorId: string, dto: CreateWorkOrderDto) {
    this.scope(agencyId);
    await this.entitlements.assertOperating(agencyId);

    // Validate foreign vehicle within same tenant if specified
    if (dto.vehicleId) {
      const v = await this.prisma.diagnosticVehicle.findUnique({
        where: { id_agencyId: { id: dto.vehicleId, agencyId } },
      });
      if (!v) {
        throw new NotFoundException('Diagnostic vehicle not found');
      }
    }

    if (dto.fleetCarId) {
      const c = await this.prisma.car.findUnique({
        where: { id_agencyId: { id: dto.fleetCarId, agencyId } },
      });
      if (!c) {
        throw new NotFoundException('Fleet car not found');
      }
    }

    // Money math via Decimal
    const hours = new Prisma.Decimal(dto.laborHours ?? 0);
    const rate = new Prisma.Decimal(dto.laborRate ?? 300);

    if (hours.lt(0) || rate.lt(0)) {
      throw new BadRequestException('Labor hours and labor rate must be non-negative');
    }

    const laborTotal = hours.times(rate).toDecimalPlaces(2);

    let partsTotal = new Prisma.Decimal(0);
    const lineItems = (dto.parts ?? []).map((p) => {
      const qty = new Prisma.Decimal(p.quantity);
      const unit = new Prisma.Decimal(p.unitPrice);

      if (qty.lt(0) || unit.lt(0)) {
        throw new BadRequestException('Parts quantity and unit price must be non-negative');
      }

      const total = qty.times(unit).toDecimalPlaces(2);
      partsTotal = partsTotal.plus(total);
      return {
        partNumber: p.partNumber,
        name: p.name,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        total: Number(total.toString()),
      };
    });

    const subtotal = laborTotal.plus(partsTotal);
    // 20% Moroccan standard VAT
    const taxAmount = subtotal.times(new Prisma.Decimal(0.20)).toDecimalPlaces(2);
    const grandTotal = subtotal.plus(taxAmount).toDecimalPlaces(2);

    const year = new Date().getFullYear();
    const count = await this.prisma.workOrder.count({ where: { agencyId } });
    const orderNumber = `WO-${year}-${String(count + 1).padStart(4, '0')}`;

    const workOrder = await this.prisma.workOrder.create({
      data: {
        orderNumber,
        agencyId,
        vehicleId: dto.vehicleId,
        fleetCarId: dto.fleetCarId,
        sessionId: dto.sessionId,
        assignedTechnicianId: dto.assignedTechnicianId,
        priority: dto.priority ?? 'MEDIUM',
        description: dto.description,
        customerNotes: dto.customerNotes,
        internalNotes: dto.internalNotes,
        laborHours: hours,
        laborRate: rate,
        laborTotal,
        partsTotal,
        taxAmount,
        totalAmount: grandTotal,
        lineItems,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
      include: {
        vehicle: true,
        fleetCar: true,
      },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      'CREATE_WORK_ORDER',
      'WORK_ORDER',
      workOrder.id,
      null,
      { orderNumber: workOrder.orderNumber, total: Number(grandTotal.toString()) },
    );

    return workOrder;
  }

  async updateStatus(
    agencyId: string,
    actorId: string,
    id: string,
    dto: UpdateWorkOrderStatusDto,
  ) {
    this.scope(agencyId);
    const existing = await this.findOne(agencyId, id);

    assertValidTransition(existing.status, dto.status);

    const targetStatus = dto.status as WorkOrderStatus;

    if (targetStatus === 'COMPLETED' && !existing.dtcCleared) {
      throw new BadRequestException(
        'Work order cannot be completed until post-repair diagnostic verification confirms DTCs are cleared',
      );
    }

    const now = new Date();

    const data: Prisma.WorkOrderUpdateInput = {
      status: targetStatus,
      ...(dto.notes
        ? {
            internalNotes: existing.internalNotes
              ? `${existing.internalNotes}\n[${now.toISOString()}] ${dto.notes}`
              : `[${now.toISOString()}] ${dto.notes}`,
          }
        : {}),
      ...(targetStatus === 'IN_PROGRESS' && !existing.startedAt
        ? { startedAt: now }
        : {}),
      ...(targetStatus === 'COMPLETED' ? { completedAt: now } : {}),
      ...(targetStatus === 'INVOICED' ? { invoicedAt: now } : {}),
    };

    const updated = await this.prisma.workOrder.update({
      where: { id_agencyId: { id, agencyId } },
      data,
    });

    if (targetStatus === 'COMPLETED' && existing.fleetCarId) {
      await this.prisma.maintenanceRecord.create({
        data: {
          carId: existing.fleetCarId,
          type: 'REPAIR',
          description: `Work Order ${existing.orderNumber}: ${existing.description}`,
          cost: existing.totalAmount,
          status: 'COMPLETED',
          garageName: 'CarHub Workshop',
        },
      });
    }

    await this.auditLogs.log(
      agencyId,
      actorId,
      'UPDATE_WORK_ORDER_STATUS',
      'WORK_ORDER',
      id,
      { status: existing.status },
      { status: targetStatus, notes: dto.notes },
    );

    return updated;
  }

  async recordVerification(
    agencyId: string,
    actorId: string,
    id: string,
    dto: VerifyWorkOrderDto,
  ) {
    this.scope(agencyId);
    const existing = await this.findOne(agencyId, id);

    const now = new Date();
    const updated = await this.prisma.workOrder.update({
      where: { id_agencyId: { id, agencyId } },
      data: {
        verificationNotes: dto.verificationNotes,
        dtcCleared: dto.dtcCleared,
        verifiedAt: now,
        // If in QUALITY_CHECK, verification advances to COMPLETED
        ...(existing.status === 'QUALITY_CHECK' ? { status: 'COMPLETED', completedAt: now } : {}),
      },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      'VERIFY_WORK_ORDER',
      'WORK_ORDER',
      id,
      { verifiedAt: existing.verifiedAt, dtcCleared: existing.dtcCleared },
      { verifiedAt: now, dtcCleared: dto.dtcCleared, notes: dto.verificationNotes },
    );

    return updated;
  }

  async verifyPostRepair(
    agencyId: string,
    id: string,
    actorId: string,
    dto: VerifyWorkOrderDto,
  ) {
    return this.recordVerification(agencyId, actorId, id, dto);
  }

  async generateInvoiceFromWorkOrder(
    agencyId: string,
    id: string,
    actorId: string,
  ) {
    this.scope(agencyId);
    const existing = await this.findOne(agencyId, id);

    if (existing.status === 'INVOICED') {
      throw new BadRequestException('Work order is already invoiced');
    }

    if (existing.status !== 'COMPLETED') {
      throw new BadRequestException('Work order must be in COMPLETED status before generating an invoice');
    }

    return this.updateStatus(agencyId, actorId, id, {
      status: 'INVOICED',
      notes: 'Generated and settled workshop repair invoice',
    });
  }
}
