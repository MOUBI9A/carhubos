import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  let service: ContractsService;
  let prisma: {
    booking: { findFirst: jest.Mock };
    contract: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const AGENCY_A = 'agency-a';
  const AGENCY_B = 'agency-b';
  const BOOKING_ID = 'booking-1';
  const CONTRACT_ID = 'contract-1';

  beforeEach(() => {
    prisma = {
      booking: { findFirst: jest.fn() },
      contract: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new ContractsService(prisma as any);
  });

  describe('generate', () => {
    it('generates a contract with sanitized HTML and status SENT', async () => {
      const mockBooking = {
        id: BOOKING_ID,
        agencyId: AGENCY_A,
        startDate: new Date('2026-11-01T10:00:00Z'),
        endDate: new Date('2026-11-05T10:00:00Z'),
        totalPrice: new Prisma.Decimal('2500.00'),
        agency: {
          name: 'Atlas Rent Morocco <script>alert(1)</script>',
          contactEmail: 'contact@atlasrent.ma',
        },
        customer: {
          firstName: 'Mohammed',
          lastName: 'Alami & Co',
          identityNumber: 'AB12345',
          identityType: 'CIN',
        },
        car: {
          brand: 'Dacia',
          model: 'Duster',
          licensePlate: '12345-A-1',
        },
      };

      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      prisma.contract.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: CONTRACT_ID, ...data }),
      );

      const result = await service.generate(AGENCY_A, BOOKING_ID);

      expect(prisma.booking.findFirst).toHaveBeenCalledWith({
        where: { id: BOOKING_ID, agencyId: AGENCY_A },
        include: { car: true, customer: true, agency: true },
      });

      expect(prisma.contract.create).toHaveBeenCalledWith({
        data: {
          content: expect.any(String),
          bookingId: BOOKING_ID,
          agencyId: AGENCY_A,
          status: 'SENT',
        },
      });

      // Verify XSS escaping
      const createdContent = prisma.contract.create.mock.calls[0][0].data.content;
      expect(createdContent).not.toContain('<script>');
      expect(createdContent).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(createdContent).toContain('Alami &amp; Co');
      expect(createdContent).toContain('2500.00 MAD');
      expect(result.status).toBe('SENT');
      expect(result.id).toBe(CONTRACT_ID);
    });

    it('throws NotFoundException when booking does not exist or belongs to another agency', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.generate(AGENCY_A, 'nonexistent-booking'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.contract.create).not.toHaveBeenCalled();
    });
  });

  describe('sign', () => {
    it('signs an unsigned contract and transitions status to SIGNED', async () => {
      prisma.contract.findFirst.mockResolvedValue({
        id: CONTRACT_ID,
        status: 'SENT',
      });
      prisma.contract.update.mockResolvedValue({
        id: CONTRACT_ID,
        status: 'SIGNED',
        signatureData: 'data:image/png;base64,mock-signature',
        signedAt: expect.any(Date),
      });

      const result = await service.sign(
        AGENCY_A,
        CONTRACT_ID,
        'data:image/png;base64,mock-signature',
      );

      expect(prisma.contract.findFirst).toHaveBeenCalledWith({
        where: { id: CONTRACT_ID, agencyId: AGENCY_A },
        select: { id: true, status: true },
      });

      expect(prisma.contract.update).toHaveBeenCalledWith({
        where: { id: CONTRACT_ID },
        data: {
          signatureData: 'data:image/png;base64,mock-signature',
          signedAt: expect.any(Date),
          status: 'SIGNED',
        },
      });

      expect(result.status).toBe('SIGNED');
    });

    it('rejects signing when contract is already SIGNED (ConflictException)', async () => {
      prisma.contract.findFirst.mockResolvedValue({
        id: CONTRACT_ID,
        status: 'SIGNED',
      });

      await expect(
        service.sign(AGENCY_A, CONTRACT_ID, 'signature-data'),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.contract.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if contract is missing or belongs to another agency', async () => {
      prisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.sign(AGENCY_B, CONTRACT_ID, 'signature-data'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.contract.update).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns contract for owning agency with relations', async () => {
      const mockContract = {
        id: CONTRACT_ID,
        agencyId: AGENCY_A,
        status: 'SIGNED',
        booking: { id: BOOKING_ID, car: {}, customer: {} },
        agency: { id: AGENCY_A, name: 'Atlas Rent' },
      };
      prisma.contract.findFirst.mockResolvedValue(mockContract);

      const result = await service.findOne(AGENCY_A, CONTRACT_ID);

      expect(prisma.contract.findFirst).toHaveBeenCalledWith({
        where: { id: CONTRACT_ID, agencyId: AGENCY_A },
        include: {
          booking: { include: { car: true, customer: true } },
          agency: true,
        },
      });
      expect(result).toEqual(mockContract);
    });

    it('throws NotFoundException for cross-tenant contract access', async () => {
      prisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(AGENCY_B, CONTRACT_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
