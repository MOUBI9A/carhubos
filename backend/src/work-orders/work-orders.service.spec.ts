import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WorkOrdersService } from './work-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PublicService } from '../public/public.service';

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let prisma: any;
  let auditLogs: any;
  let entitlements: any;
  let publicService: any;

  const agencyId = 'agency-1';
  const actorId = 'user-1';

  beforeEach(async () => {
    publicService = {
      generateEstimateToken: jest.fn().mockReturnValue('tok-sample-123'),
      verifyEstimateToken: jest.fn(),
    };
    prisma = {
      workOrder: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn(),
      },
      diagnosticSession: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      diagnosticVehicle: {
        findUnique: jest.fn().mockResolvedValue({ id: 'veh-1', agencyId }),
      },
      car: {
        findUnique: jest.fn().mockResolvedValue({ id: 'car-1', agencyId }),
      },
      maintenanceRecord: {
        create: jest.fn().mockResolvedValue({ id: 'm-1' }),
      },
    };

    auditLogs = {
      log: jest.fn().mockResolvedValue({ id: 'log-1' }),
    };

    entitlements = {
      assertOperating: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: EntitlementsService, useValue: entitlements },
        { provide: PublicService, useValue: publicService },
      ],
    }).compile();

    service = module.get<WorkOrdersService>(WorkOrdersService);
  });

  describe('create', () => {
    it('creates work order with accurate Decimal labor, parts, and 20% VAT math', async () => {
      prisma.workOrder.create.mockImplementation(({ data }: any) => ({
        id: 'wo-1',
        ...data,
      }));

      const res = await service.create(agencyId, actorId, {
        description: 'Brake pad and rotor replacement',
        laborHours: 2.0,
        laborRate: 300,
        parts: [
          { partNumber: 'BP-01', name: 'Front Brake Pads', quantity: 1, unitPrice: 400 },
          { partNumber: 'BR-01', name: 'Front Brake Rotors', quantity: 2, unitPrice: 300 },
        ],
      });

      expect(res.id).toBe('wo-1');
      expect(res.orderNumber).toMatch(/^WO-\d{4}-0001$/);
      // Labor: 2 * 300 = 600
      expect(res.laborTotal.toString()).toBe('600');
      // Parts: 400 + (2 * 300) = 1000
      expect(res.partsTotal.toString()).toBe('1000');
      // Subtotal: 1600. VAT 20%: 320
      expect(res.taxAmount.toString()).toBe('320');
      // Total: 1920
      expect(res.totalAmount.toString()).toBe('1920');

      expect(auditLogs.log).toHaveBeenCalledWith(
        agencyId,
        actorId,
        'CREATE_WORK_ORDER',
        'WORK_ORDER',
        'wo-1',
        null,
        expect.objectContaining({ total: 1920 }),
      );
    });
  });

  describe('updateStatus', () => {
    it('allows valid state machine transitions and logs audit', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        agencyId,
        status: 'DRAFT',
      });
      prisma.workOrder.update.mockResolvedValue({
        id: 'wo-1',
        agencyId,
        status: 'AWAITING_APPROVAL',
      });

      const updated = await service.updateStatus(agencyId, actorId, 'wo-1', {
        status: 'AWAITING_APPROVAL',
        notes: 'Submitted for owner approval',
      });

      expect(updated.status).toBe('AWAITING_APPROVAL');
      expect(auditLogs.log).toHaveBeenCalledWith(
        agencyId,
        actorId,
        'UPDATE_WORK_ORDER_STATUS',
        'WORK_ORDER',
        'wo-1',
        { status: 'DRAFT' },
        { status: 'AWAITING_APPROVAL', notes: 'Submitted for owner approval' },
      );
    });

    it('rejects invalid state machine transitions with BadRequestException', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        agencyId,
        status: 'DRAFT',
      });

      await expect(
        service.updateStatus(agencyId, actorId, 'wo-1', {
          status: 'COMPLETED',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets startedAt timestamp when transitioning to IN_PROGRESS', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        agencyId,
        status: 'APPROVED',
        startedAt: null,
      });
      prisma.workOrder.update.mockImplementation(({ data }: any) => ({
        id: 'wo-1',
        status: 'IN_PROGRESS',
        startedAt: data.startedAt,
      }));

      const updated = await service.updateStatus(agencyId, actorId, 'wo-1', {
        status: 'IN_PROGRESS',
      });

      expect(updated.status).toBe('IN_PROGRESS');
      expect(updated.startedAt).toBeDefined();
    });

    it('creates MaintenanceRecord for fleetCar when transitioning to COMPLETED', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        agencyId,
        orderNumber: 'WO-2026-0001',
        description: 'Brake service',
        totalAmount: new Prisma.Decimal(1920),
        status: 'QUALITY_CHECK',
        fleetCarId: 'car-1',
        dtcCleared: true,
      });
      prisma.workOrder.update.mockResolvedValue({
        id: 'wo-1',
        status: 'COMPLETED',
      });

      await service.updateStatus(agencyId, actorId, 'wo-1', {
        status: 'COMPLETED',
      });

      expect(prisma.maintenanceRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          carId: 'car-1',
          type: 'REPAIR',
          status: 'COMPLETED',
        }),
      });
    });
  });

  describe('recordVerification', () => {
    it('records post-repair verification and advances QUALITY_CHECK to COMPLETED', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        agencyId,
        status: 'QUALITY_CHECK',
        verifiedAt: null,
        dtcCleared: false,
      });
      prisma.workOrder.update.mockResolvedValue({
        id: 'wo-1',
        status: 'COMPLETED',
        dtcCleared: true,
        verificationNotes: 'DTCs cleared, road test 15km normal',
      });

      const res = await service.recordVerification(agencyId, actorId, 'wo-1', {
        verificationNotes: 'DTCs cleared, road test 15km normal',
        dtcCleared: true,
      });

      expect(res.status).toBe('COMPLETED');
      expect(res.dtcCleared).toBe(true);
      expect(auditLogs.log).toHaveBeenCalledWith(
        agencyId,
        actorId,
        'VERIFY_WORK_ORDER',
        'WORK_ORDER',
        'wo-1',
        expect.anything(),
        expect.objectContaining({ dtcCleared: true }),
      );
    });
  });

  describe('multi-tenant isolation', () => {
    it('returns NotFoundException (404) on cross-tenant access to prevent IDOR', async () => {
      prisma.workOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('other-agency', 'wo-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOperationalMetrics', () => {
    it('aggregates operational metrics answering core garage questions', async () => {
      prisma.workOrder.groupBy.mockResolvedValue([
        { status: 'DRAFT', _count: { id: 2 } },
        { status: 'IN_PROGRESS', _count: { id: 3 } },
        { status: 'WAITING_FOR_PARTS', _count: { id: 1 } },
        { status: 'QUALITY_CHECK', _count: { id: 1 } },
        { status: 'COMPLETED', _count: { id: 5 } },
      ]);
      prisma.diagnosticSession.count.mockResolvedValue(2);
      prisma.diagnosticSession.findMany.mockResolvedValue([
        { data: { dtcs: [{ code: 'P0300' }] } },
        { data: { dtcs: [] } },
      ]);

      const metrics = await service.getOperationalMetrics(agencyId);

      expect(metrics.waitingVehicles).toBe(2);
      expect(metrics.activeRepairs).toBe(3);
      expect(metrics.blockedJobs).toBe(1);
      expect(metrics.readyForQc).toBe(1);
      expect(metrics.completedThisMonth).toBe(5);
      expect(metrics.diagnosticsNeedingReview).toBe(2);
      expect(metrics.criticalIssuesCount).toBe(1);
    });
  });

  describe('generatePdf', () => {
    it('generates a printable work order PDF buffer with Moroccan Dirham pricing', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        agencyId,
        orderNumber: 'WO-2026-0001',
        status: 'IN_PROGRESS',
        description: 'Misfire repair P0300',
        laborHours: new Prisma.Decimal(1.5),
        laborRate: new Prisma.Decimal(250),
        laborTotal: new Prisma.Decimal(375),
        partsTotal: new Prisma.Decimal(480),
        taxAmount: new Prisma.Decimal(171),
        totalAmount: new Prisma.Decimal(1026),
        parts: [{ partNumber: 'NGK-P0300', name: 'Bougies Iridium', quantity: 4, unitPrice: 120 }],
        dtcCleared: false,
        createdAt: new Date(),
        vehicle: { brand: 'Renault', model: 'Clio', vin: 'VF1BB0A0512345678', year: 2022 },
        fleetCar: null,
        assignedTechnician: { name: 'Karim Alami' },
      });
      prisma.agency = {
        findUnique: jest.fn().mockResolvedValue({
          id: agencyId,
          name: 'Garage Alami Casablanca',
          address: 'Boulevard Zerktouni, Casablanca',
          taxId: 'ICE001234567890',
          phone: '+212522000000',
        }),
      };

      const buffer = await service.generatePdf(agencyId, 'wo-1');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    }, 15000);
  });

  describe('getApprovalShareLink', () => {
    it('returns signed remote share token and path for valid work order', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        agencyId,
        orderNumber: 'WO-2026-0001',
        status: 'AWAITING_APPROVAL',
      });

      const res = await service.getApprovalShareLink(agencyId, 'wo-1');
      expect(res.orderId).toBe('wo-1');
      expect(res.orderNumber).toBe('WO-2026-0001');
      expect(res.token).toBe('tok-sample-123');
      expect(res.sharePath).toBe('/estimate-approval/tok-sample-123');
      expect(publicService.generateEstimateToken).toHaveBeenCalledWith(agencyId, 'wo-1');
    });
  });
});

