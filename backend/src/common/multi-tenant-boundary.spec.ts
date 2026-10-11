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
import { TasksService } from '../tasks/tasks.service';
import { RefusalLogsService } from '../refusal-logs/refusal-logs.service';
import { SearchService } from './search/search.service';
import { VaultService } from '../vault/vault.service';

/**
 * Cross-cutting regression test for the tenant-isolation invariant: an
 * authenticated user of agency A must get a 404 (never a 403, never real
 * data) when reaching for a resource that belongs to agency B — every
 * business query must be scoped by agencyId, never trust an id alone.
 *
 * A mocked Prisma is sufficient — this is about the WHERE clause and the
 * exception thrown, not the DB. Covers bookings, customers, documents,
 * inspections, expenses, contracts, hub, cars, maintenance, payments, tasks,
 * refusal-logs, and search. Three scoping shapes are represented: the common
 * `findFirst({ where: { id, agencyId } }) -> 404`; the **load-then-check**
 * variant (payments.verify — find by id alone, then scope by the invoice's
 * agencyId); and **write-scoping** (tasks.updateStatus — updateMany({id,
 * agencyId}), count===0 -> 404). All regression-guarded explicitly.
 *
 * `automations` and `notifications` were considered for this file too (per
 * `docs/EXECUTION_PLAN.md` T2) but don't have a matching boundary to test:
 * `automations` is cron-only (no controller, no caller-supplied id — see
 * finding F4), and `notifications.controller.ts`'s only route builds a
 * WhatsApp deep-link from query params with no DB lookup at all. Neither has
 * an IDOR surface in the shape this file checks.
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
    const svc = new PaymentsService(
      prisma as any,
      {} as any,
      { log: jest.fn() } as any,
    );

    await expect(
      svc.verify(RESOURCE_ID, 'user-a', 'OWNER', AGENCY_A),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      svc.verify(RESOURCE_ID, 'user-b', 'OWNER', AGENCY_B),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('TasksService.updateStatus 404s across tenants (updateMany write-scoping)', async () => {
    // Tasks scope the WRITE itself: updateMany({ id, agencyId }) touches 0 rows
    // for a foreign task, and count === 0 → 404. A distinct IDOR-prevention
    // mechanism from the findFirst-then-check shape used elsewhere.
    const prisma = {
      task: {
        updateMany: jest.fn(({ where }: any) =>
          Promise.resolve({
            count: where.id === RESOURCE_ID && where.agencyId === AGENCY_B ? 1 : 0,
          }),
        ),
        findUnique: jest.fn().mockResolvedValue({ id: RESOURCE_ID, status: 'DONE' }),
      },
    };
    const svc = new TasksService(prisma as any);

    await expect(
      svc.updateStatus(AGENCY_A, RESOURCE_ID, 'DONE'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.updateStatus(AGENCY_B, RESOURCE_ID, 'DONE')).resolves.toBeDefined();
  });

  it('RefusalLogsService.updateStatus 404s across tenants', async () => {
    const prisma = {
      refusalLog: {
        findFirst: agencyScopedFindFirst(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const svc = new RefusalLogsService(prisma as any);

    await expect(
      svc.updateStatus(AGENCY_A, RESOURCE_ID, 'RECOVERED'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      svc.updateStatus(AGENCY_B, RESOURCE_ID, 'RECOVERED'),
    ).resolves.toBeDefined();
  });

  it('SearchService.search never returns another agency\'s cars/customers/bookings', async () => {
    // Real rows all belong to agency B; the mock only filters by agencyId
    // (like the real WHERE clause would) so this isolates the tenant
    // boundary from the text-matching logic itself.
    const carB = { id: 'car-b', agencyId: AGENCY_B, brand: 'Dacia', model: 'Duster' };
    const customerB = { id: 'cust-b', agencyId: AGENCY_B, firstName: 'Yassine' };
    const bookingB = { id: 'booking-b', agencyId: AGENCY_B, status: 'ACTIVE' };

    function scopedFindMany(rows: any[]) {
      return jest.fn(({ where }: any) =>
        Promise.resolve(rows.filter((r) => r.agencyId === where.agencyId)),
      );
    }

    const prisma = {
      car: { findMany: scopedFindMany([carB]) },
      customer: { findMany: scopedFindMany([customerB]) },
      booking: { findMany: scopedFindMany([bookingB]) },
    };
    const svc = new SearchService(prisma as any);

    // Agency A searches a term that would match B's data on every field —
    // must come back empty, not leak B's rows.
    await expect(svc.search(AGENCY_A, 'Dacia')).resolves.toEqual({
      cars: [],
      customers: [],
      bookings: [],
      total: 0,
    });

    // Sanity: the true owner (agency B) does find its own data with the
    // same query — proves the emptiness above is the tenant guard, not a
    // broken mock.
    const resultForB = await svc.search(AGENCY_B, 'Dacia');
    expect(resultForB.total).toBe(3);
  });

  it('VaultService.getDownloadUrl / remove 404 across tenants', async () => {
    const prisma = {
      vaultFile: {
        findFirst: agencyScopedFindFirst(),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const storage = {
      createSignedUrl: jest.fn().mockResolvedValue('https://signed.example/x'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const svc = new VaultService(prisma as any, storage as any);

    await expect(svc.getDownloadUrl(AGENCY_A, RESOURCE_ID)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.remove(AGENCY_A, RESOURCE_ID)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.getDownloadUrl(AGENCY_B, RESOURCE_ID)).resolves.toBeDefined();
    await expect(svc.remove(AGENCY_B, RESOURCE_ID)).resolves.toBeDefined();
  });
});
