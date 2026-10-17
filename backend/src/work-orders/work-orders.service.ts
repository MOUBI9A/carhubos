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
    const laborTotal = hours.times(rate).toDecimalPlaces(2);

    let partsTotal = new Prisma.Decimal(0);
    const lineItems = (dto.parts ?? []).map((p) => {
      const qty = new Prisma.Decimal(p.quantity);
      const unit = new Prisma.Decimal(p.unitPrice);
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
}
