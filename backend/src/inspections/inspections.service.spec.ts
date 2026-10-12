import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InspectionsService } from './inspections.service';

function dec(n: number) {
  return new Prisma.Decimal(n);
}

function makePrisma(overrides: any = {}) {
  const state = {
    cars: [] as any[],
    bookings: [] as any[],
    inspections: [] as any[],
    invoices: [] as any[],
    payments: [] as any[],
    tasks: [] as any[],
    auditLogs: [] as any[],
  };

  const prisma: any = {
    car: {
      findFirst: jest.fn(async ({ where }: any) =>
        state.cars.find((c) => c.id === where.id && c.agencyId === where.agencyId) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const c = state.cars.find((x) => x.id === where.id);
        Object.assign(c, data);
        return c;
      }),
    },
    booking: {
      findFirst: jest.fn(async ({ where }: any) => {
        const b = state.bookings.find(
          (x) =>
            x.id === where.id &&
            x.agencyId === where.agencyId &&
            (!where.carId || x.carId === where.carId),
        );
        if (!b) return null;
        return { ...b, invoices: state.invoices.filter((i) => i.bookingId === b.id) };
      }),
    },
    inspection: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `insp-${state.inspections.length + 1}`, createdAt: new Date(), ...data };
        state.inspections.push(row);
        return row;
      }),
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        let rows = state.inspections.filter((i) => {
          if (where.bookingId && i.bookingId !== where.bookingId) return false;
          if (where.type && i.type !== where.type) return false;
          if (where.booking?.agencyId) {
            const b = state.bookings.find((x) => x.id === i.bookingId);
            if (!b || b.agencyId !== where.booking.agencyId) return false;
          }
          return true;
        });
        if (orderBy?.createdAt === 'desc') {
          rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return rows[0] ?? null;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        state.inspections.filter((i) => {
          if (where.bookingId && i.bookingId !== where.bookingId) return false;
          if (where.carId && i.carId !== where.carId) return false;
          if (where.car?.agencyId) {
            const car = state.cars.find((c) => c.id === i.carId);
            if (!car || car.agencyId !== where.car.agencyId) return false;
          }
          return true;
        }),
      ),
    },
    task: {
      create: jest.fn(async ({ data }: any) => {
        state.tasks.push(data);
        return data;
      }),
    },
    payment: {
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `pay-${state.payments.length + 1}`,
          ...data,
          amount: data.amount instanceof Prisma.Decimal ? data.amount : dec(data.amount),
        };
        state.payments.push(row);
        return row;
      }),
      aggregate: jest.fn(async ({ where }: any) => {
        const sum = state.payments
          .filter((p) => {
            if (where.invoiceId && p.invoiceId !== where.invoiceId) return false;
            if (where.status && p.status !== where.status) return false;
            if (where.type && p.type !== where.type) return false;
            return true;
          })
          .reduce((acc, p) => acc.plus(p.amount), dec(0));
        return { _sum: { amount: sum } };
      }),
    },
    invoice: {
      update: jest.fn(async ({ where, data }: any) => {
        const inv = state.invoices.find((i) => i.id === where.id);
        Object.assign(inv, data);
        return inv;
      }),
    },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
    ...overrides,
  };

  return { prisma, state };
}

function makeAuditLogs(state: { auditLogs: any[] }) {
  return {
    log: jest.fn(async (agencyId: string, actorId: string, action: string, entityType: string, entityId: string, before?: any, after?: any) => {
      const row = { agencyId, actorId, action, entityType, entityId, before, after };
      state.auditLogs.push(row);
      return row;
    }),
  };
}

describe('InspectionsService', () => {
  describe('create — return/damage inspection flow', () => {
    it('does not auto-charge when there is no PRE_RENTAL match for the booking', async () => {
      const { prisma, state } = makePrisma();
      state.cars.push({ id: 'car-1', agencyId: 'ag-1', nextServiceKm: null, brand: 'Dacia', model: 'Logan' });
      state.bookings.push({ id: 'bk-1', agencyId: 'ag-1', carId: 'car-1' });
      state.invoices.push({ id: 'inv-1', bookingId: 'bk-1', agencyId: 'ag-1', amount: dec(1000), status: 'DUE' });

      const auditLogs = makeAuditLogs(state);
      const svc = new InspectionsService(prisma, auditLogs as any);

      await svc.create('ag-1', {
        type: 'POST_RENTAL',
        fuelLevel: 8,
        mileage: 1000,
        damages: JSON.stringify([{ type: 'SCRATCH', location: 'door' }]),
        carId: 'car-1',
        bookingId: 'bk-1',
        inspectorId: 'user-1',
      });

      expect(state.payments.length).toBe(0);
      expect(auditLogs.log).not.toHaveBeenCalled();
      expect(state.invoices[0].status).toBe('DUE');
    });

    it('auto-creates a VERIFIED damage-charge Payment + AuditLog when POST_RENTAL introduces new damage vs a clean PRE_RENTAL', async () => {
      const { prisma, state } = makePrisma();
      state.cars.push({ id: 'car-1', agencyId: 'ag-1', nextServiceKm: null, brand: 'Dacia', model: 'Logan' });
      state.bookings.push({ id: 'bk-1', agencyId: 'ag-1', carId: 'car-1' });
      state.invoices.push({ id: 'inv-1', bookingId: 'bk-1', agencyId: 'ag-1', amount: dec(1000), status: 'DUE' });

      // Clean PRE_RENTAL baseline
      state.inspections.push({
        id: 'insp-pre',
        type: 'PRE_RENTAL',
        fuelLevel: 8,
        mileage: 900,
        damages: JSON.stringify([]),
        carId: 'car-1',
        bookingId: 'bk-1',
        inspectorId: 'user-1',
        createdAt: new Date('2026-01-01'),
      });

      const auditLogs = makeAuditLogs(state);
      const svc = new InspectionsService(prisma, auditLogs as any);

      const result = await svc.create('ag-1', {
        type: 'POST_RENTAL',
        fuelLevel: 8,
        mileage: 1000,
        damages: JSON.stringify([{ type: 'SCRATCH', location: 'Rear Bumper' }]),
        carId: 'car-1',
        bookingId: 'bk-1',
        inspectorId: 'user-2',
      });

      expect(result.id).toBeDefined();
      expect(state.payments.length).toBe(1);
      expect(state.payments[0].status).toBe('VERIFIED');
      expect(state.payments[0].type).toBe('INCOME');
      expect(state.payments[0].invoiceId).toBe('inv-1');
      expect(state.payments[0].reference).toContain('Damage charge (auto-assessed from inspection diff)');
      // No real cost signal on the damage entry -> placeholder amount + manual review note
      expect(state.payments[0].amount.toNumber()).toBe(0);
      expect(state.payments[0].reference).toContain('MANUAL REVIEW REQUIRED');

      expect(auditLogs.log).toHaveBeenCalledTimes(1);
      const [agencyId, , action, entityType, entityId] = auditLogs.log.mock.calls[0];
      expect(agencyId).toBe('ag-1');
      expect(action).toBe('AUTO_DAMAGE_CHARGE');
      expect(entityType).toBe('BOOKING');
      expect(entityId).toBe('bk-1');
    });

    it('sums real declared cost signals on new damage entries instead of using the placeholder', async () => {
      const { prisma, state } = makePrisma();
      state.cars.push({ id: 'car-1', agencyId: 'ag-1', nextServiceKm: null, brand: 'Dacia', model: 'Logan' });
      state.bookings.push({ id: 'bk-1', agencyId: 'ag-1', carId: 'car-1' });
      state.invoices.push({ id: 'inv-1', bookingId: 'bk-1', agencyId: 'ag-1', amount: dec(1000), status: 'DUE' });

      state.inspections.push({
        id: 'insp-pre',
        type: 'PRE_RENTAL',
        fuelLevel: 8,
        mileage: 900,
        damages: JSON.stringify([]),
        carId: 'car-1',
        bookingId: 'bk-1',
        inspectorId: 'user-1',
        createdAt: new Date('2026-01-01'),
      });

      const auditLogs = makeAuditLogs(state);
      const svc = new InspectionsService(prisma, auditLogs as any);

      await svc.create('ag-1', {
        type: 'POST_RENTAL',
        fuelLevel: 8,
        mileage: 1000,
        damages: JSON.stringify([{ type: 'DENT', location: 'Door', estimatedCost: 350 }]),
        carId: 'car-1',
        bookingId: 'bk-1',
        inspectorId: 'user-2',
      });

      expect(state.payments[0].amount.toNumber()).toBe(350);
      expect(state.payments[0].reference).not.toContain('MANUAL REVIEW REQUIRED');
    });

    it('scopes bookings by tenant — wrong agencyId throws NotFoundException', async () => {
      const { prisma, state } = makePrisma();
      state.cars.push({ id: 'car-1', agencyId: 'ag-1', nextServiceKm: null, brand: 'Dacia', model: 'Logan' });
      state.bookings.push({ id: 'bk-1', agencyId: 'ag-1', carId: 'car-1' });

      const auditLogs = makeAuditLogs(state);
      const svc = new InspectionsService(prisma, auditLogs as any);

      await expect(
        svc.create('ag-OTHER', {
          type: 'POST_RENTAL',
          fuelLevel: 8,
          mileage: 1000,
          damages: JSON.stringify([{ type: 'SCRATCH', location: 'door' }]),
          carId: 'car-1',
          bookingId: 'bk-1',
          inspectorId: 'user-2',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(state.payments.length).toBe(0);
      expect(auditLogs.log).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns only inspections for cars belonging to the agency', async () => {
      const { prisma, state } = makePrisma();
      state.cars.push(
        { id: 'car-1', agencyId: 'ag-1', brand: 'Dacia', model: 'Logan', plateNumber: '123-A-1' },
        { id: 'car-2', agencyId: 'ag-2', brand: 'Renault', model: 'Clio', plateNumber: '456-B-2' },
      );
      state.inspections.push(
        { id: 'insp-1', carId: 'car-1', type: 'PRE_RENTAL', mileage: 1000, fuelLevel: 8 },
        { id: 'insp-2', carId: 'car-2', type: 'PRE_RENTAL', mileage: 2000, fuelLevel: 8 },
      );
      const auditLogs = makeAuditLogs(state);
      const svc = new InspectionsService(prisma, auditLogs as any);

      const result = await svc.findAll('ag-1');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('insp-1');
    });
  });

  describe('findBookingDiff', () => {
    it('404s for a foreign-agency booking', async () => {
      const { prisma, state } = makePrisma();
      state.bookings.push({ id: 'bk-1', agencyId: 'ag-1', carId: 'car-1' });
      const auditLogs = makeAuditLogs(state);
      const svc = new InspectionsService(prisma, auditLogs as any);

      await expect(svc.findBookingDiff('ag-OTHER', 'bk-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
