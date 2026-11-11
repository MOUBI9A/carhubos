import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WorkOrdersService } from './work-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { ReportIntegrityService } from '../diagnostics/reports/report-integrity';

/**
 * Automotive Adversarial & Financial Invariant Stress Test Suite.
 *
 * Modeled after the high-rigor financial adversarial suite of Creator Revenue OS
 * (financial-adversarial.integration.test.ts) adapted natively for CarHub's
 * automotive work orders, Moroccan VAT (20%), Decimal precision, DTC verification,
 * and strict multi-tenant boundary preservation.
 */
describe('Automotive Adversarial & Financial Integrity Stress', () => {
  let service: WorkOrdersService;
  let mockPrisma: any;
  let mockAuditLogs: any;
  let mockEntitlements: any;

  const AGENCY_A = 'agency-maroc-tanger';
  const AGENCY_B = 'agency-maroc-casablanca';
  const TECHNICIAN_ID = 'tech-hassan-123';

  beforeEach(() => {
    mockPrisma = {
      workOrder: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      diagnosticVehicle: {
        findUnique: jest.fn(),
      },
      car: {
        findUnique: jest.fn(),
      },
      invoice: {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      maintenanceRecord: {
        create: jest.fn().mockResolvedValue({ id: 'm-record-1' }),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    mockAuditLogs = {
      log: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
    };

    mockEntitlements = {
      assertOperating: jest.fn().mockResolvedValue(true),
    };

    service = new WorkOrdersService(
      mockPrisma,
      mockAuditLogs,
      mockEntitlements,
      { generateEstimateToken: jest.fn().mockReturnValue('tok-adv-123') } as any,
    );
  });

  describe('1. Adversarial Financial Invariants (MAD, Decimal precision, 20% VAT)', () => {
    it('maintains absolute zero decimal drift under fractional labor hours and odd parts pricing', async () => {
      mockPrisma.workOrder.create.mockImplementation(({ data }: any) => ({
        id: 'wo-odd-pricing',
        ...data,
      }));

      // 3.33 hours @ 287.50 MAD/hr = 957.375 -> Decimal(12,2) = 957.38 MAD
      // 7 oil filters @ 49.99 MAD = 349.93 MAD
      // Labor total = 957.38 MAD
      // Parts total = 349.93 MAD
      // Subtotal = 1307.31 MAD
      // 20% VAT = 261.462 -> 261.46 MAD
      // Total = 1568.77 MAD
      const result = await service.create(AGENCY_A, TECHNICIAN_ID, {
        description: 'Odd fractional stress test',
        laborHours: 3.33,
        laborRate: 287.5,
        parts: [
          { partNumber: 'FILT-01', name: 'Oil Filter', quantity: 7, unitPrice: 49.99 },
        ],
      });

      expect(result.laborTotal.equals(new Prisma.Decimal('957.38'))).toBe(true);
      expect(result.partsTotal.equals(new Prisma.Decimal('349.93'))).toBe(true);
      expect(result.taxAmount.equals(new Prisma.Decimal('261.46'))).toBe(true);
      expect(result.totalAmount.equals(new Prisma.Decimal('1568.77'))).toBe(true);

      // Conservation Invariant: totalAmount - taxAmount == laborTotal + partsTotal
      const subtotalCalculated = result.laborTotal.plus(result.partsTotal);
      const subtotalFromTotal = result.totalAmount.minus(result.taxAmount);
      expect(subtotalCalculated.equals(subtotalFromTotal)).toBe(true);
    });

    it('rejects adversarial negative labor hours, negative rates, or negative part quantities', async () => {
      await expect(
        service.create(AGENCY_A, TECHNICIAN_ID, {
          description: 'Adversarial negative hours',
          laborHours: -5,
          laborRate: 300,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(AGENCY_A, TECHNICIAN_ID, {
          description: 'Adversarial negative rate',
          laborHours: 2,
          laborRate: -100,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(AGENCY_A, TECHNICIAN_ID, {
          description: 'Adversarial negative quantity',
          laborHours: 1,
          laborRate: 300,
          parts: [{ partNumber: 'PART-NEG', name: 'Drain Plug', quantity: -2, unitPrice: 50 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. State Machine Adversarial Bypasses', () => {
    it('blocks illegal state transition jumps (DRAFT -> COMPLETED)', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-draft-1',
        agencyId: AGENCY_A,
        status: 'DRAFT',
        dtcCleared: true,
      });

      await expect(
        service.updateStatus(AGENCY_A, TECHNICIAN_ID, 'wo-draft-1', { status: 'COMPLETED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks illegal state rollback (COMPLETED -> DRAFT or INVOICED -> IN_PROGRESS)', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-completed-1',
        agencyId: AGENCY_A,
        status: 'COMPLETED',
        dtcCleared: true,
      });

      await expect(
        service.updateStatus(AGENCY_A, TECHNICIAN_ID, 'wo-completed-1', { status: 'DRAFT' }),
      ).rejects.toThrow(BadRequestException);

      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-invoiced-1',
        agencyId: AGENCY_A,
        status: 'INVOICED',
        dtcCleared: true,
      });

      await expect(
        service.updateStatus(AGENCY_A, TECHNICIAN_ID, 'wo-invoiced-1', { status: 'IN_PROGRESS' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('enforces post-repair DTC verification before allowing transition to COMPLETED', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-ready-1',
        agencyId: AGENCY_A,
        status: 'READY_FOR_QUALITY_CHECK',
        dtcCleared: false, // NOT verified clean of DTCs
      });

      // Transition to QUALITY_CHECK succeeds
      mockPrisma.workOrder.update.mockResolvedValue({
        id: 'wo-ready-1',
        agencyId: AGENCY_A,
        status: 'QUALITY_CHECK',
        dtcCleared: false,
      });

      // But trying to finish to COMPLETED without DTC clearance is blocked
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-ready-1',
        agencyId: AGENCY_A,
        status: 'QUALITY_CHECK',
        dtcCleared: false,
      });

      await expect(
        service.updateStatus(AGENCY_A, TECHNICIAN_ID, 'wo-ready-1', { status: 'COMPLETED' }),
      ).rejects.toThrow(BadRequestException);

      // Technician performs verification and clears DTCs
      mockPrisma.workOrder.update.mockImplementation(({ data }: any) => ({
        id: 'wo-ready-1',
        agencyId: AGENCY_A,
        ...data,
      }));

      await service.verifyPostRepair(AGENCY_A, 'wo-ready-1', TECHNICIAN_ID, {
        dtcCleared: true,
        verificationNotes: 'Road test 10 km completed; OBD-II Mode 01 and Mode 03 report 0 active faults.',
      });

      // Now with dtcCleared=true, COMPLETED succeeds
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-ready-1',
        agencyId: AGENCY_A,
        status: 'QUALITY_CHECK',
        dtcCleared: true,
      });

      const completed = await service.updateStatus(AGENCY_A, TECHNICIAN_ID, 'wo-ready-1', { status: 'COMPLETED' });
      expect(completed.status).toBe('COMPLETED');
    });
  });

  describe('3. Multi-Tenant Injection & IDOR Attack Resistance', () => {
    it('blocks cross-tenant vehicle injection during work order creation', async () => {
      // Vehicle belongs to AGENCY_B
      mockPrisma.diagnosticVehicle.findUnique.mockResolvedValue(null);

      await expect(
        service.create(AGENCY_A, TECHNICIAN_ID, {
          description: 'Hacked work order targeting Agency B vehicle',
          vehicleId: 'veh-agency-b',
          laborHours: 1,
          laborRate: 300,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('blocks cross-tenant fleet car injection during work order creation', async () => {
      // Car belongs to AGENCY_B
      mockPrisma.car.findUnique.mockResolvedValue(null);

      await expect(
        service.create(AGENCY_A, TECHNICIAN_ID, {
          description: 'Hacked work order targeting Agency B fleet car',
          fleetCarId: 'car-agency-b',
          laborHours: 1,
          laborRate: 300,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns 404 NotFoundException (never 403) when accessing work orders across tenants', async () => {
      mockPrisma.workOrder.findUnique.mockImplementation(({ where }: any) => {
        if (where.id_agencyId?.agencyId === AGENCY_B) {
          return Promise.resolve({ id: 'wo-agency-b', agencyId: AGENCY_B });
        }
        return Promise.resolve(null);
      });

      await expect(service.findOne(AGENCY_A, 'wo-agency-b')).rejects.toThrow(NotFoundException);
    });
  });

  describe('4. Invoicing Idempotency & Double-Billing Prevention', () => {
    it('blocks generating an invoice for a work order that is already INVOICED', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-already-invoiced',
        agencyId: AGENCY_A,
        status: 'INVOICED',
      });

      await expect(
        service.generateInvoiceFromWorkOrder(AGENCY_A, 'wo-already-invoiced', TECHNICIAN_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks generating an invoice for a work order that is not yet COMPLETED', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-still-in-progress',
        agencyId: AGENCY_A,
        status: 'IN_PROGRESS',
      });

      await expect(
        service.generateInvoiceFromWorkOrder(AGENCY_A, 'wo-still-in-progress', TECHNICIAN_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. Tamper-Evident Diagnostic Cryptographic Seal Invariant', () => {
    it('detects any single bit tamper or mutation in session findings', () => {
      const canonicalData = {
        sessionId: 'sess-001',
        vehicleId: 'veh-001',
        vin: 'VF1BZ000000000000',
        dtcs: ['P0300', 'P0171'],
        findings: [
          { code: 'P0300', title: 'Random Misfire', severity: 'CRITICAL' },
        ],
        timestamp: '2026-10-18T00:00:00.000Z',
      };

      const originalHash = ReportIntegrityService.computeReportHash(canonicalData);
      expect(originalHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string

      // Verify intact
      expect(ReportIntegrityService.verifyReportIntegrity(canonicalData, originalHash)).toBe(true);

      // Adversarial mutation: Alter DTC code
      const tamperedDtc = {
        ...canonicalData,
        dtcs: ['P0000', 'P0171'],
      };
      expect(ReportIntegrityService.verifyReportIntegrity(tamperedDtc, originalHash)).toBe(false);

      // Adversarial mutation: Alter severity from CRITICAL to LOW
      const tamperedSeverity = {
        ...canonicalData,
        findings: [
          { code: 'P0300', title: 'Random Misfire', severity: 'LOW' },
        ],
      };
      expect(ReportIntegrityService.verifyReportIntegrity(tamperedSeverity, originalHash)).toBe(false);
    });
  });
});
