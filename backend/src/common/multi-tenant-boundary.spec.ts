import { NotFoundException, ConflictException } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';
import { CustomersService } from '../customers/customers.service';
import { DocumentsService } from '../documents/documents.service';
import { InspectionsService } from '../inspections/inspections.service';
import { ExpensesService } from '../expenses/expenses.service';
import { ContractsService } from '../contracts/contracts.service';
import { HubService } from '../hub/hub.service';
import { CarsService } from '../cars/cars.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { PaymentsService } from '../payments/payments.service';

/**
 * Cross-cutting regression test for the tenant-isolation invariant: an
 * authenticated user of agency A must get a 404 (never a 403, never real
 * data) when reaching for a resource that belongs to agency B — every
 * business query must be scoped by agencyId, never trust an id alone.
 *
 * A mocked Prisma is sufficient — this is about the WHERE clause and the
 * exception thrown, not the DB. Covers bookings, customers, documents,
 * inspections, expenses, contracts, hub, cars, maintenance, and payments.
 * Most follow the `findFirst({ where: { id, agencyId } }) -> NotFoundException`
 * shape; payments.verify is the higher-risk **load-then-check** variant (find by
 * id alone, then scope by the invoice's agencyId), regression-guarded explicitly.
 */
const AGENCY_A = 'agency-a';
const AGENCY_B = 'agency-b';
const RESOURCE_ID = 'resource-owned-by-b';

function agencyScopedFindFirst() {
  // Simulates a real Prisma findFirst({ where: { id, agencyId } }): only
  // returns a row when BOTH the id and the caller's agencyId match.
  return jest.fn(({ where }: any) => {
    const matches = where.id === RESOURCE_ID && where.agencyId === AGENCY_B;
    return Promise.resolve(matches ? { id: RESOURCE_ID, agencyId: AGENCY_B } : null);
  });
}

describe('Multi-tenant boundary — agency A can never reach agency B resources', () => {
  it('BookingsService.findOne 404s across tenants', async () => {
    const prisma = { booking: { findFirst: agencyScopedFindFirst() } };
    const svc = new BookingsService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(svc.findOne(AGENCY_A, RESOURCE_ID)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.findOne(AGENCY_B, RESOURCE_ID)).resolves.toBeDefined();
  });

  it('CustomersService.findOne 404s across tenants', async () => {
    const prisma = {
      customer: { findFirst: agencyScopedFindFirst() },
      payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }) },
    };
    const svc = new CustomersService(prisma as any, {} as any);

    await expect(svc.findOne(AGENCY_A, RESOURCE_ID)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.findOne(AGENCY_B, RESOURCE_ID)).resolves.toBeDefined();
  });

  it('DocumentsService.findAllForCar 404s across tenants (car ownership check)', async () => {
    const prisma = {
      car: { findFirst: agencyScopedFindFirst() },
      carDocument: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new DocumentsService(prisma as any);

    await expect(svc.findAllForCar(AGENCY_A, RESOURCE_ID)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.findAllForCar(AGENCY_B, RESOURCE_ID)).resolves.toBeDefined();
  });

  it('ContractsService.sign 404s across tenants', async () => {
    const prisma = {
      contract: {
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve(
            where.id === RESOURCE_ID && where.agencyId === AGENCY_B
              ? { id: RESOURCE_ID, status: 'SENT' }
              : null,
          ),
        ),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const svc = new ContractsService(prisma as any);

    await expect(svc.sign(AGENCY_A, RESOURCE_ID, 'sig')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.sign(AGENCY_B, RESOURCE_ID, 'sig')).resolves.toBeDefined();
  });

  it('HubService.listAsset 404s across tenants (car ownership check)', async () => {
    const prisma = {
      car: { findFirst: agencyScopedFindFirst() },
      hubListing: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
    };
    const svc = new HubService(prisma as any);

    await expect(svc.listAsset(AGENCY_A, RESOURCE_ID, 100)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.listAsset(AGENCY_B, RESOURCE_ID, 100)).resolves.toBeDefined();
  });

  it('ExpensesService.update/remove 404 across tenants', async () => {
    const prisma = {
      expense: {
        findFirst: agencyScopedFindFirst(),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const svc = new ExpensesService(prisma as any);

    await expect(svc.update(AGENCY_A, RESOURCE_ID, {})).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.remove(AGENCY_A, RESOURCE_ID)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.update(AGENCY_B, RESOURCE_ID, {})).resolves.toBeDefined();
  });

  it('InspectionsService.findByCar/findByBooking scope every read by agencyId in the WHERE clause', async () => {
    // These two reads don't 404 (they just return an empty list for a
    // non-existent/foreign id) — the invariant here is that agencyId is
    // ALWAYS part of the query, so a foreign id can never leak another
    // tenant's rows via a bare id match.
    const findManyCar = jest.fn().mockResolvedValue([]);
    const findManyBooking = jest.fn().mockResolvedValue([]);
    const prisma = { inspection: { findMany: findManyCar } };
    const svc = new InspectionsService(prisma as any, {} as any);

    await svc.findByCar(AGENCY_A, RESOURCE_ID);
    expect(findManyCar.mock.calls[0][0].where).toMatchObject({
      carId: RESOURCE_ID,
      car: { agencyId: AGENCY_A },
    });

    prisma.inspection.findMany = findManyBooking;
    await svc.findByBooking(AGENCY_A, RESOURCE_ID);
    expect(findManyBooking.mock.calls[0][0].where).toMatchObject({
      bookingId: RESOURCE_ID,
      booking: { agencyId: AGENCY_A },
    });
  });

  it('CarsService.findOne 404s across tenants', async () => {
    const prisma = { car: { findFirst: agencyScopedFindFirst() } };
    const svc = new CarsService(prisma as any, {} as any, {} as any);

    await expect(svc.findOne(AGENCY_A, RESOURCE_ID)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.findOne(AGENCY_B, RESOURCE_ID)).resolves.toBeDefined();
  });

  it('MaintenanceService.findAllForCar 404s across tenants (car ownership check)', async () => {
    const prisma = {
      car: { findFirst: agencyScopedFindFirst() },
      maintenanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new MaintenanceService(prisma as any, {} as any);

    await expect(svc.findAllForCar(AGENCY_A, RESOURCE_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(svc.findAllForCar(AGENCY_B, RESOURCE_ID)).resolves.toBeDefined();
  });

  it('PaymentsService.verify 404s across tenants (scoped by invoice.agencyId, not the payment id)', async () => {
    // verify() loads the payment by id ALONE, then scopes by invoice.agencyId — a
    // load-then-check IDOR spot (this regression-guards the Phase 1 fix). Agency A
    // must 404; agency B clears the tenant boundary and is stopped only by the
    // later status guard (409), which proves isolation didn't reject it.
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: RESOURCE_ID,
          status: 'VERIFIED', // not PENDING → past the tenant check, agency B hits 409
          type: 'INCOME',
          invoiceId: 'inv-b',
          invoice: { agencyId: AGENCY_B },
        }),
      },
    };
    const svc = new PaymentsService(prisma as any, {} as any);

    await expect(
      svc.verify(RESOURCE_ID, 'user-a', 'OWNER', AGENCY_A),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      svc.verify(RESOURCE_ID, 'user-b', 'OWNER', AGENCY_B),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
