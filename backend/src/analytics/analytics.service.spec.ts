import { NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

/**
 * Tenant-boundary coverage for the analytics ROI path (finding F1).
 *
 * `GET /analytics/car/:id` used to read another agency's car + all its bookings
 * and maintenance, AND recompute-and-write its ROI, via unscoped `findUnique` /
 * `car.update` — a cross-tenant IDOR that both leaked data and tampered with
 * another tenant's row through a GET. The fix scopes every read/write by
 * `{ id, agencyId }`: the read yields null → 404 (no existence leak, §5.1), and
 * the write is an `updateMany` carrying agencyId so it can never touch another
 * tenant. A mocked Prisma is enough — this is about the WHERE clauses the
 * service builds and the NotFoundException it throws, not the DB.
 */
describe('AnalyticsService — ROI tenant boundary (F1)', () => {
  const AGENCY_A = 'agency-aaaa';
  const AGENCY_B = 'agency-bbbb';
  const CAR = { id: 'car-1', agencyId: AGENCY_A, currentRoi: 0 };

  // Prisma double: car.findFirst only resolves the row for its true owner
  // ({ id, agencyId }), exactly as the DB would; car.update MUST never be
  // called (the guarded write is updateMany).
  function makePrisma(carRow: any) {
    const car = {
      findFirst: jest.fn((args: any) =>
        Promise.resolve(
          args.where.id === CAR.id && args.where.agencyId === CAR.agencyId
            ? carRow
            : null,
        ),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: carRow ? 1 : 0 }),
      update: jest.fn(),
    };
    const payment = {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
    };
    const maintenanceRecord = {
      aggregate: jest.fn().mockResolvedValue({ _sum: { cost: null } }),
    };
    const prisma = { car, payment, maintenanceRecord };
    return { prisma, car };
  }

  describe('calculateCarRoi', () => {
    it('reads scoped by { id, agencyId } and writes via updateMany carrying agencyId', async () => {
      const { prisma, car } = makePrisma(CAR);
      const svc = new AnalyticsService(prisma as any);

      await svc.calculateCarRoi(AGENCY_A, 'car-1');

      expect(car.findFirst).toHaveBeenCalledWith({
        where: { id: 'car-1', agencyId: AGENCY_A },
      });
      // The write is guarded: updateMany with agencyId in the WHERE, never the
      // unique-only `update` that the pre-fix code used.
      expect(car.update).not.toHaveBeenCalled();
      expect(car.updateMany).toHaveBeenCalledTimes(1);
      expect(car.updateMany.mock.calls[0][0].where).toEqual({
        id: 'car-1',
        agencyId: AGENCY_A,
      });
    });

    it('cross-tenant carId → returns 0 and never writes (no tamper via GET)', async () => {
      const { prisma, car } = makePrisma(CAR);
      const svc = new AnalyticsService(prisma as any);

      // Agency B asks to recompute A's car → scoped read misses → 0, no write.
      const roi = await svc.calculateCarRoi(AGENCY_B, 'car-1');

      expect(roi).toBe(0);
      expect(car.findFirst.mock.calls[0][0].where).toEqual({
        id: 'car-1',
        agencyId: AGENCY_B,
      });
      expect(car.updateMany).not.toHaveBeenCalled();
      expect(car.update).not.toHaveBeenCalled();
    });
  });

  describe('getCarPerformance', () => {
    it('same-tenant → returns the agency-scoped car + a numeric roiScore', async () => {
      const { prisma, car } = makePrisma({ ...CAR, maintenance: [], bookings: [] });
      const svc = new AnalyticsService(prisma as any);

      const result = await svc.getCarPerformance(AGENCY_A, 'car-1');

      expect(result.car).toBeTruthy();
      expect(typeof result.roiScore).toBe('number');
      // The detail read (the one with the includes) is scoped to the caller.
      const detailCall = car.findFirst.mock.calls.find((c: any) => c[0].include);
      expect(detailCall).toBeDefined();
      expect(detailCall?.[0]?.where).toEqual({ id: 'car-1', agencyId: AGENCY_A });
    });

    it('cross-tenant carId → NotFoundException (404), never leaks or writes the row', async () => {
      const { prisma, car } = makePrisma({ ...CAR, maintenance: [], bookings: [] });
      const svc = new AnalyticsService(prisma as any);

      await expect(
        svc.getCarPerformance(AGENCY_B, 'car-1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      // Every car read carried B's agencyId — never A's — so nothing cross-tenant
      // was fetched, and no ROI was written onto A's row.
      for (const call of car.findFirst.mock.calls) {
        expect(call[0].where.agencyId).toBe(AGENCY_B);
      }
      expect(car.updateMany).not.toHaveBeenCalled();
      expect(car.update).not.toHaveBeenCalled();
    });
  });

  /**
   * getUtilizationMetrics previously filtered bookings by `startDate >=
   * thirtyDaysAgo`, which silently dropped any still-ACTIVE booking that
   * started before the 30-day window (undercounting utilization for
   * longer-running rentals) and never clamped `endDate` to "now", so a
   * booking with a future planned return counted not-yet-elapsed days as
   * already rented (overcounting). Fixed to proper interval-overlap
   * semantics against [thirtyDaysAgo, now] on both ends. QA sweep 2026-07-28.
   */
  describe('getUtilizationMetrics', () => {
    const AGENCY = 'agency-util';
    const DAY_MS = 24 * 60 * 60 * 1000;

    function makeUtilPrisma(carCount: number, bookings: Array<{ startDate: Date; endDate: Date }>) {
      const car = { count: jest.fn().mockResolvedValue(carCount) };
      const booking = { findMany: jest.fn().mockResolvedValue(bookings) };
      return { prisma: { car, booking }, car, booking };
    }

    it('counts a booking that started more than 30 days ago but is still ACTIVE', async () => {
      const now = Date.now();
      const startedFarBack = new Date(now - 45 * DAY_MS);
      const endsSoon = new Date(now + 2 * DAY_MS);
      const { prisma, booking } = makeUtilPrisma(1, [
        { startDate: startedFarBack, endDate: endsSoon },
      ]);
      const svc = new AnalyticsService(prisma as any);

      const result = await svc.getUtilizationMetrics(AGENCY);

      // The query itself must not exclude this booking via startDate >= thirtyDaysAgo.
      const where = booking.findMany.mock.calls[0][0].where;
      expect(where.startDate).toEqual({ lte: expect.any(Date) });
      expect(where.endDate).toEqual({ gte: expect.any(Date) });
      // Rented days are clamped to the 30-day window: exactly 30 days counted,
      // not 0 (old bug) and not the full 47-day span of the booking.
      expect(result.totalRentedDays).toBe(30);
      expect(result.utilizationRate).toBeCloseTo(100, 5);
    });

    it('does not count an ACTIVE booking future days beyond "now"', async () => {
      // Pinned clock: the service reads `new Date()` internally, so without
      // faking the timer, any real elapsed ms between capturing `now` here
      // and the service's own `new Date()` call could push the boundary
      // case (exactly 1 elapsed day) to 2 via Math.ceil — flaky by design
      // otherwise. Fake timers make test and service see the same instant.
      jest.useFakeTimers({ now: new Date('2026-07-28T12:00:00.000Z') });
      const now = Date.now();
      const startedRecently = new Date(now - 1 * DAY_MS);
      const endsInFuture = new Date(now + 10 * DAY_MS);
      const { prisma } = makeUtilPrisma(1, [
        { startDate: startedRecently, endDate: endsInFuture },
      ]);
      const svc = new AnalyticsService(prisma as any);

      const result = await svc.getUtilizationMetrics(AGENCY);
      jest.useRealTimers();

      // Only the 1 elapsed day should count, not the 11-day full span.
      expect(result.totalRentedDays).toBe(1);
      expect(result.totalFleetDays).toBe(30);
    });
  });
});
