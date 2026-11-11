import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Browser } from 'puppeteer';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import { VerifyWorkOrderDto } from './dto/verify-work-order.dto';
import {
  assertValidTransition,
  WorkOrderStatus,
} from './work-order-state-machine';
import { PublicService } from '../public/public.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly entitlements: EntitlementsService,
    private readonly publicService: PublicService,
  ) {}

  private scope(agencyId: string) {
    if (!agencyId) {
      throw new ForbiddenException('An agency context is required');
    }
  }

  async findAll(
    agencyId: string,
    filters?: {
      status?: string;
      vehicleId?: string;
      assignedTechnicianId?: string;
    },
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

    const [statusCounts, sessionsNeedingReview, openSessions] =
      await Promise.all([
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
    const blockedJobs =
      (counts['WAITING_FOR_PARTS'] || 0) + (counts['BLOCKED'] || 0);
    const readyForQc =
      (counts['READY_FOR_QUALITY_CHECK'] || 0) + (counts['QUALITY_CHECK'] || 0);
    const awaitingApproval = counts['AWAITING_APPROVAL'] || 0;
    const completedThisMonth =
      (counts['COMPLETED'] || 0) + (counts['INVOICED'] || 0);

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
      throw new BadRequestException(
        'Labor hours and labor rate must be non-negative',
      );
    }

    const laborTotal = hours.times(rate).toDecimalPlaces(2);

    let partsTotal = new Prisma.Decimal(0);
    const lineItems = (dto.parts ?? []).map((p) => {
      const qty = new Prisma.Decimal(p.quantity);
      const unit = new Prisma.Decimal(p.unitPrice);

      if (qty.lt(0) || unit.lt(0)) {
        throw new BadRequestException(
          'Parts quantity and unit price must be non-negative',
        );
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
    const taxAmount = subtotal
      .times(new Prisma.Decimal(0.2))
      .toDecimalPlaces(2);
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
      {
        orderNumber: workOrder.orderNumber,
        total: Number(grandTotal.toString()),
      },
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

    const targetStatus = dto.status;

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
        ...(existing.status === 'QUALITY_CHECK'
          ? { status: 'COMPLETED', completedAt: now }
          : {}),
      },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      'VERIFY_WORK_ORDER',
      'WORK_ORDER',
      id,
      { verifiedAt: existing.verifiedAt, dtcCleared: existing.dtcCleared },
      {
        verifiedAt: now,
        dtcCleared: dto.dtcCleared,
        notes: dto.verificationNotes,
      },
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
      throw new BadRequestException(
        'Work order must be in COMPLETED status before generating an invoice',
      );
    }

    return this.updateStatus(agencyId, actorId, id, {
      status: 'INVOICED',
      notes: 'Generated and settled workshop repair invoice',
    });
  }

  async generatePdf(agencyId: string, id: string): Promise<Buffer> {
    this.scope(agencyId);
    const order = await this.findOne(agencyId, id);
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });

    const esc = (val: unknown) => {
      if (val === null || val === undefined) return '';
      const printable =
        typeof val === 'string'
          ? val
          : typeof val === 'number' ||
              typeof val === 'boolean' ||
              typeof val === 'bigint'
            ? val.toString()
            : typeof val === 'object'
              ? (JSON.stringify(val) ?? '')
              : '';
      return (printable ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const rawParts = (order as any).parts;
    const parts = (Array.isArray(rawParts) ? rawParts : []) as Array<{
      partNumber?: string;
      name?: string;
      quantity?: number;
      unitPrice?: number;
    }>;

    const vehicleTitle = order.fleetCar
      ? `${order.fleetCar.brand} ${order.fleetCar.model} (${order.fleetCar.licensePlate})`
      : order.vehicle
        ? `${order.vehicle.brand} ${order.vehicle.model} ${order.vehicle.year ?? ''}`
        : 'Véhicule Atelier';

    const vin = order.vehicle?.vin || 'Non renseigné';
    const technicianName =
      order.assignedTechnician?.name || "Technicien d'Atelier";

    const partsRows =
      parts.length > 0
        ? parts
            .map((p) => {
              const qty = Number(p.quantity || 1);
              const price = Number(p.unitPrice || 0);
              const total = qty * price;
              return `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${esc(p.partNumber || '-')}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${esc(p.name || 'Pièce détachée')}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${qty}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${price.toFixed(2)} MAD</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${total.toFixed(2)} MAD</td>
          </tr>`;
            })
            .join('')
        : `<tr><td colspan="5" style="padding: 12px; text-align: center; color: #64748b; font-style: italic;">Aucune pièce de rechange facturée</td></tr>`;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ordre de Réparation ${esc(order.orderNumber)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 30px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7c3aed; padding-bottom: 15px; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; margin: 0; }
    .agency-name { font-size: 16px; font-weight: bold; color: #7c3aed; margin: 0 0 4px 0; }
    .muted { color: #64748b; font-size: 10px; margin: 2px 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase; background: #f1f5f9; color: #475569; }
    .grid { display: flex; gap: 20px; margin-bottom: 20px; }
    .card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; }
    .card-title { font-size: 11px; font-weight: bold; color: #7c3aed; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
    .totals { margin-top: 20px; display: flex; justify-content: flex-end; }
    .totals-box { width: 280px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fafafa; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
    .grand-total { font-size: 14px; font-weight: 900; color: #7c3aed; border-top: 2px solid #cbd5e1; padding-top: 8px; margin-top: 4px; }
    .qc-box { margin-top: 25px; border: 2px dashed ${order.dtcCleared ? '#10b981' : '#f59e0b'}; border-radius: 8px; padding: 15px; background: ${order.dtcCleared ? '#ecfdf5' : '#fffbeb'}; }
    .qc-title { font-weight: bold; color: ${order.dtcCleared ? '#065f46' : '#92400e'}; font-size: 12px; margin-bottom: 5px; }
    .signatures { margin-top: 40px; display: flex; justify-content: space-between; }
    .sig-box { width: 45%; border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center; font-size: 10px; color: #64748b; }
    footer { margin-top: 40px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 class="agency-name">${esc(agency?.name || 'CarHub Workshop')}</h2>
      <p class="muted">${esc(agency?.address || 'Maroc')}</p>
      <p class="muted">ICE / N° Fiscal: ${esc(agency?.taxId || 'N/A')}</p>
      <p class="muted">Tél: ${esc(agency?.businessPhone || 'N/A')}</p>
    </div>
    <div style="text-align: right;">
      <h1 class="title">Ordre de Réparation</h1>
      <p style="font-family: monospace; font-size: 12px; font-weight: bold; margin: 4px 0;">${esc(order.orderNumber)}</p>
      <span class="badge">${esc(order.status)}</span>
      <p class="muted">Date: ${new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Véhicule & Client</div>
      <p style="margin: 0; font-size: 13px; font-weight: bold;">${esc(vehicleTitle)}</p>
      <p class="muted">VIN: <span style="font-family: monospace;">${esc(vin)}</span></p>
      <p class="muted">Technicien assigné: <strong>${esc(technicianName)}</strong></p>
    </div>
    <div class="card">
      <div class="card-title">Motif & Description Atelier</div>
      <p style="margin: 0; font-size: 11px;">${esc(order.description || 'Intervention mécanique / diagnostique')}</p>
      ${order.priority ? `<p class="muted">Priorité: <strong>${esc(order.priority)}</strong></p>` : ''}
    </div>
  </div>

  <h3 style="font-size: 13px; font-weight: bold; color: #1e1b4b; text-transform: uppercase; margin: 20px 0 5px 0;">Détail des Pièces & Main d'Œuvre</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 20%;">Référence</th>
        <th style="width: 40%;">Désignation</th>
        <th style="width: 10%; text-align: center;">Qté</th>
        <th style="width: 15%; text-align: right;">Prix Unitaire</th>
        <th style="width: 15%; text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${partsRows}
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">MO-STD</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Main d'Œuvre Spécialisée Atelier (${Number(order.laborHours).toFixed(1)} hrs @ ${Number(order.laborRate).toFixed(2)} MAD/h)</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${Number(order.laborHours).toFixed(1)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Number(order.laborRate).toFixed(2)} MAD</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${Number(order.laborTotal).toFixed(2)} MAD</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Total Pièces HT:</span><span>${Number(order.partsTotal).toFixed(2)} MAD</span></div>
      <div class="total-row"><span>Total Main d'Œuvre HT:</span><span>${Number(order.laborTotal).toFixed(2)} MAD</span></div>
      <div class="total-row"><span>Sous-total HT:</span><span>${(Number(order.partsTotal) + Number(order.laborTotal)).toFixed(2)} MAD</span></div>
      <div class="total-row"><span>TVA (20%):</span><span>${Number(order.taxAmount).toFixed(2)} MAD</span></div>
      <div class="total-row grand-total"><span>Total Net TTC:</span><span>${Number(order.totalAmount).toFixed(2)} MAD</span></div>
    </div>
  </div>

  <div class="qc-box">
    <div class="qc-title">Certification Post-Réparation & Diagnostic OBD-II</div>
    <p style="margin: 2px 0; font-size: 11px;">
      Codes défauts (DTC) réinitialisés & effacés : <strong>${order.dtcCleared ? 'OUI (VÉRIFIÉ)' : 'NON (EN ATTENTE)'}</strong>
    </p>
    <p style="margin: 2px 0; font-size: 10px; color: #64748b;">
      Notes d'essai sur route : ${esc(order.verificationNotes || 'Essai statique et dynamique atelier')}
    </p>
    ${order.verifiedAt ? `<p style="margin: 2px 0; font-size: 10px; color: #065f46;">Contrôle qualité certifié le ${new Date(order.verifiedAt).toLocaleString('fr-FR')}</p>` : ''}
  </div>

  <div class="signatures">
    <div class="sig-box">Bon pour Accord / Visa Client<br><br><br>Date & Signature</div>
    <div class="sig-box">Responsable Atelier / Chef d'Équipe<br><br><br>Date & Signature</div>
  </div>

  <footer>
    Fider / CarHub OS · Système d'Exploitation Automobile & Gestion d'Atelier · Document généré le ${new Date().toLocaleString('fr-FR')} · ID: ${order.id}
  </footer>
</body>
</html>`;

    let browser: Browser | undefined;
    try {
      const puppeteer = await import('puppeteer');
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      if (!browser) {
        throw new Error('Failed to launch PDF headless browser engine');
      }
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        printBackground: true,
      });
      return Buffer.from(pdf);
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * Generates a signed remote estimate approval link that can be shared with the car owner.
   */
  async getApprovalShareLink(agencyId: string, id: string) {
    const order = await this.findOne(agencyId, id);
    const token = this.publicService.generateEstimateToken(agencyId, id);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      token,
      sharePath: `/estimate-approval/${token}`,
    };
  }
}
