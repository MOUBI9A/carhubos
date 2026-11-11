import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { Response } from 'express';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AuthGuard } from '../auth/auth.guard';
import { CAPABILITIES_KEY } from '../common/decorators/require-capabilities.decorator';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RenterGuard } from '../portal/guards/renter.guard';
import { PrismaService } from '../prisma/prisma.service';
import { GuardianPdfService } from './guardian-pdf.service';
import {
  GuardianCustomerPdfController,
  GuardianStaffPdfController,
} from './guardian-pdf.controller';

describe('Guardian PDF route authorization and download headers', () => {
  const result = {
    buffer: Buffer.from('%PDF-1.7'),
    filename: 'guardian-report-1-r7.pdf',
    revision: 7,
  };

  it('protects staff PDF with authentication and booking.view capability', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, GuardianStaffPdfController),
    ).toEqual([AuthGuard, CapabilitiesGuard]);
    const handler = Object.getOwnPropertyDescriptor(
      GuardianStaffPdfController.prototype,
      'pdf',
    )!.value;
    expect(Reflect.getMetadata(CAPABILITIES_KEY, handler)).toEqual([
      'booking.view',
    ]);
  });

  it('protects customer PDF with authentication and renter portal guard', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, GuardianCustomerPdfController),
    ).toEqual([AuthGuard, RenterGuard]);
  });

  it.each(['staff', 'customer'])(
    'serves a private downloadable %s PDF using only authenticated context',
    async (side) => {
      const service: any = {
        forStaff: jest.fn().mockResolvedValue(result),
        forCustomer: jest.fn().mockResolvedValue(result),
      };
      const response: any = { setHeader: jest.fn(), send: jest.fn() };
      if (side === 'staff') {
        await new GuardianStaffPdfController(service).pdf(
          { agencyId: 'jwt-agency' },
          'report-1',
          response as Response,
        );
        expect(service.forStaff).toHaveBeenCalledWith('jwt-agency', 'report-1');
      } else {
        await new GuardianCustomerPdfController(service).pdf(
          { id: 'jwt-renter' },
          'report-1',
          response as Response,
        );
        expect(service.forCustomer).toHaveBeenCalledWith(
          'jwt-renter',
          'report-1',
        );
      }
      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="guardian-report-1-r7.pdf"',
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'private, no-store',
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff',
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-Guardian-Revision',
        '7',
      );
      expect(response.send).toHaveBeenCalledWith(result.buffer);
    },
  );

  it('does not send PDF bytes when scoped service authorization fails', async () => {
    const service: any = {
      forCustomer: jest
        .fn()
        .mockRejectedValue(new Error('Inspection not found.')),
    };
    const response: any = { setHeader: jest.fn(), send: jest.fn() };
    await expect(
      new GuardianCustomerPdfController(service).pdf(
        { id: 'foreign-renter' },
        'report-1',
        response as Response,
      ),
    ).rejects.toThrow('Inspection not found.');
    expect(response.send).not.toHaveBeenCalled();
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});

describe('Guardian PDF HTTP authorization with real JWT and capability guards', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let report: any;
  let render: jest.SpyInstance;
  const prisma: any = {
    agencyMembership: {
      findUnique: jest.fn(({ where }: any) => {
        const membership = where.userId_agencyId;
        if (membership.userId === 'staff-no-cap') return { capabilities: [] };
        if (membership.userId === 'staff' && membership.agencyId === 'agency-1')
          return { capabilities: ['booking.view'] };
        if (
          membership.userId === 'foreign-staff' &&
          membership.agencyId === 'agency-2'
        )
          return { capabilities: ['booking.view'] };
        return null;
      }),
    },
    guardianReport: {
      findFirst: jest.fn(({ where }: any) => {
        if (
          where.id !== report.id ||
          (where.agencyId && where.agencyId !== report.agencyId) ||
          where.status?.not === report.status
        )
          return null;
        if (
          where.OR &&
          !where.OR.some((condition: any) => {
            const booking = condition.booking;
            return booking.renterId === null
              ? report.booking.renterId === null &&
                  booking.customer.userId === report.booking.customer.userId
              : booking.renterId === report.booking.renterId;
          })
        )
          return null;
        return report;
      }),
    },
    $transaction: jest.fn((work: (tx: any) => unknown) => work(prisma)),
  };
  const token = (sub: string, role = 'RENTER', agencyId?: string) =>
    jwt.sign({ sub, role, agencyId, isVerified: true });
  const get = (side: 'staff' | 'customer', bearer?: string) => {
    const req = request(app.getHttpServer()).get(
      `/api/guardian/${side}/reports/report-1/pdf`,
    );
    return bearer ? req.set('Authorization', `Bearer ${bearer}`) : req;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
      controllers: [GuardianStaffPdfController, GuardianCustomerPdfController],
      providers: [
        GuardianPdfService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    jwt = module.get(JwtService);
    const pdfRenderer = module.get<GuardianPdfService>(
      GuardianPdfService,
    ) as unknown as { render: (html: string) => Promise<Buffer> };
    render = jest
      .spyOn(pdfRenderer, 'render')
      .mockResolvedValue(Buffer.from('%PDF-1.7\nprivate-report'));
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    render.mockClear();
    prisma.guardianReport.findFirst.mockClear();
    report = {
      id: 'report-1',
      agencyId: 'agency-1',
      carId: 'car-1',
      bookingId: 'booking-1',
      phase: 'OUT',
      mode: 'QUICK',
      status: 'CUSTOMER_REVIEW',
      revision: 2,
      agencyApprovedRevision: 2,
      customerApprovedRevision: null,
      mileage: 123,
      fuelLevel: 50,
      createdAt: new Date('2026-11-11T10:00:00Z'),
      updatedAt: new Date('2026-11-11T10:05:00Z'),
      publishedAt: new Date('2026-11-11T10:05:00Z'),
      mutuallyApprovedAt: null,
      agency: { name: 'Agency' },
      car: {
        agencyId: 'agency-1',
        brand: 'Dacia',
        model: 'Sandero',
        licensePlate: '123-A',
      },
      booking: {
        agencyId: 'agency-1',
        carId: 'car-1',
        renterId: 'renter',
        customer: { agencyId: 'agency-1', userId: 'renter' },
      },
      findings: [],
      evidence: [],
      events: [],
    };
  });

  it('returns 401 without a valid session before any report read', async () => {
    await get('staff').expect(401);
    await get('customer', 'invalid-jwt').expect(401);
    expect(prisma.guardianReport.findFirst).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
  it('returns 403 for staff missing booking.view before any report read', async () => {
    await get('staff', token('staff-no-cap', 'AGENT', 'agency-1')).expect(403);
    expect(prisma.guardianReport.findFirst).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
  it('returns 403 to agency staff on the renter-only endpoint', async () => {
    await get('customer', token('staff', 'AGENT', 'agency-1')).expect(403);
    expect(render).not.toHaveBeenCalled();
  });
  it('returns 404 for a capable foreign tenant and a foreign renter', async () => {
    await get('staff', token('foreign-staff', 'AGENT', 'agency-2')).expect(404);
    await get('customer', token('foreign-renter')).expect(404);
    expect(render).not.toHaveBeenCalled();
  });
  it('returns 404 to platform users without a tenant despite capability bypass', async () => {
    await get('staff', token('root', 'ROOT_ADMIN')).expect(404);
    expect(prisma.guardianReport.findFirst).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
  it('returns 404 for a linked renter when the report is still a draft', async () => {
    report.status = 'DRAFT';
    await get('customer', token('renter')).expect(404);
    expect(render).not.toHaveBeenCalled();
  });
  it('returns 404 to a conflicting customer user when the booking has an explicit renter', async () => {
    report.booking.customer.userId = 'different-renter';
    await get('customer', token('different-renter')).expect(404);
    expect(render).not.toHaveBeenCalled();
  });
  it('returns 404 for a customer record from a different agency', async () => {
    report.booking.customer.agencyId = 'agency-2';
    await get('customer', token('renter')).expect(404);
    expect(render).not.toHaveBeenCalled();
  });
  it.each(['staff', 'customer'] as const)(
    'downloads authorized %s bytes with no-store and revision headers',
    async (side) => {
      await get(
        side,
        side === 'staff'
          ? token('staff', 'AGENT', 'agency-1')
          : token('renter'),
      )
        .expect(200)
        .expect('Content-Type', 'application/pdf')
        .expect('Cache-Control', 'private, no-store')
        .expect('X-Guardian-Revision', '2')
        .expect(
          'Content-Disposition',
          'attachment; filename="guardian-report-1-r2.pdf"',
        );
      expect(render).toHaveBeenCalledTimes(1);
    },
  );
});
