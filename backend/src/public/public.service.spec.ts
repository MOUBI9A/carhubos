import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PublicService } from './public.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('PublicService — Customer Estimate Approval', () => {
  let service: PublicService;
  let prisma: any;
  let auditLogs: any;

  const agencyId = 'agency-101';
  const workOrderId = 'wo-999';

  beforeEach(async () => {
    prisma = {
      workOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };

    auditLogs = {
      log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  describe('token generation and verification', () => {
    it('generates a valid signed token and successfully verifies it', () => {
      const token = service.generateEstimateToken(agencyId, workOrderId);
      expect(typeof token).toBe('string');
      expect(token).toContain('.');

      const payload = service.verifyEstimateToken(token);
      expect(payload.agencyId).toBe(agencyId);
      expect(payload.workOrderId).toBe(workOrderId);
      expect(payload.exp).toBeGreaterThan(Date.now());
    });

    it('rejects tampered tokens with UnauthorizedException', () => {
      const token = service.generateEstimateToken(agencyId, workOrderId);
      const [payloadB64, sig] = token.split('.');
      const tampered = `${payloadB64}x.${sig}`;
      expect(() => service.verifyEstimateToken(tampered)).toThrow(UnauthorizedException);
    });

    it('rejects expired tokens', () => {
      // Mock an expired token
      const expiredPayload = {
        workOrderId,
        agencyId,
        exp: Date.now() - 1000,
      };
      const b64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
      const crypto = require('crypto');
      const sig = crypto
        .createHmac('sha256', (service as any).getSigningKey())
        .update(b64)
        .digest('base64url');
      const expiredToken = `${b64}.${sig}`;

      expect(() => service.verifyEstimateToken(expiredToken)).toThrow(UnauthorizedException);
    });
  });

  describe('getPublicEstimate', () => {
    it('returns sanitized public estimate scoped by agency and workOrderId', async () => {
      const token = service.generateEstimateToken(agencyId, workOrderId);

      prisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        orderNumber: 'WO-2026-0099',
        status: 'AWAITING_APPROVAL',
        priority: 'HIGH',
        description: 'Remplacement embrayage',
        customerNotes: 'Bruit au point mort',
        laborHours: new Prisma.Decimal(4),
        laborRate: new Prisma.Decimal(300),
        laborTotal: new Prisma.Decimal(1200),
        partsTotal: new Prisma.Decimal(1500),
        taxAmount: new Prisma.Decimal(540),
        totalAmount: new Prisma.Decimal(3240),
        currency: 'MAD',
        parts: [{ partNumber: 'CLUTCH-KIT-01', name: 'Kit Embrayage Valeo', quantity: 1, unitPrice: 1500 }],
        createdAt: new Date(),
        agency: {
          id: agencyId,
          name: 'Atelier Mécanique Casablanca',
          city: 'Casablanca',
          address: 'Boulevard Ghandi',
          businessPhone: '+212522123456',
          contactEmail: 'contact@atelier.ma',
          deletedAt: null,
        },
        vehicle: {
          brand: 'Dacia',
          model: 'Duster',
          year: 2021,
          vin: 'UU1HSD0A512345678',
        },
        fleetCar: null,
      });

      const estimate = await service.getPublicEstimate(token);
      expect(estimate.orderNumber).toBe('WO-2026-0099');
      expect(estimate.status).toBe('AWAITING_APPROVAL');
      expect(estimate.totalAmount).toBe(3240);
      expect(estimate.agency.name).toBe('Atelier Mécanique Casablanca');
      expect(estimate.vehicle.brand).toBe('Dacia');
      // VIN must be masked for customer privacy
      expect(estimate.vehicle.maskedVin).toBe('UU1••••••••5678');
    });

    it('throws NotFoundException if work order belongs to another agency or does not exist', async () => {
      const token = service.generateEstimateToken(agencyId, workOrderId);
      prisma.workOrder.findUnique.mockResolvedValue(null);

      await expect(service.getPublicEstimate(token)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approvePublicEstimate', () => {
    it('approves an estimate in AWAITING_APPROVAL and creates an audit log', async () => {
      const token = service.generateEstimateToken(agencyId, workOrderId);

      prisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        agencyId,
        orderNumber: 'WO-2026-0099',
        status: 'AWAITING_APPROVAL',
        customerNotes: 'Remplacer aussi le filtre à air si nécessaire',
      });

      prisma.workOrder.update.mockResolvedValue({
        id: workOrderId,
        orderNumber: 'WO-2026-0099',
        status: 'APPROVED',
      });

      const res = await service.approvePublicEstimate(token, {
        customerName: 'Youssef Mansouri',
        notes: 'D\'accord pour le montant de 3240 MAD.',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('APPROVED');
      expect(prisma.workOrder.update).toHaveBeenCalled();
      expect(auditLogs.log).toHaveBeenCalledWith(
        agencyId,
        'PUBLIC_CUSTOMER',
        'WORK_ORDER_CUSTOMER_APPROVED',
        'WORK_ORDER',
        workOrderId,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('rejects approval if order is already CANCELLED or COMPLETED', async () => {
      const token = service.generateEstimateToken(agencyId, workOrderId);

      prisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        agencyId,
        orderNumber: 'WO-2026-0099',
        status: 'CANCELLED',
      });

      await expect(
        service.approvePublicEstimate(token, { customerName: 'Youssef' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
