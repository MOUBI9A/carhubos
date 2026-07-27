import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';

function dec(n: number) {
  return new Prisma.Decimal(n);
}

function makePrisma(overrides: any = {}) {
  const state = {
    payments: [] as any[],
    invoices: [] as any[],
  };

  const prisma: any = {
    payment: {
      findMany: jest.fn(async ({ where }: any) =>
        state.payments.filter((p) => {
          if (where?.status && p.status !== where.status) return false;
          if (where?.invoice?.agencyId && p.invoice?.agencyId !== where.invoice.agencyId)
            return false;
          return true;
        }),
      ),
      findUnique: jest.fn(async ({ where }: any) =>
        state.payments.find((p) => p.id === where.id) ?? null,
      ),
      count: jest.fn(async ({ where }: any) =>
        state.payments.filter((p) => {
          if (where?.status && p.status !== where.status) return false;
          if (where?.invoice?.agencyId && p.invoice?.agencyId !== where.invoice.agencyId)
            return false;
          return true;
        }).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `pay-${state.payments.length + 1}`,
          ...data,
          amount: data.amount instanceof Prisma.Decimal ? data.amount : dec(data.amount),
          invoice: state.invoices.find((i) => i.id === data.invoiceId),
        };
        state.payments.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const p = state.payments.find((x) => x.id === where.id);
        Object.assign(p, data);
        return p;
      }),
      aggregate: jest.fn(async ({ where }: any) => {
        const sum = state.payments
          .filter((p) => {
            if (where.invoiceId && p.invoiceId !== where.invoiceId) return false;
            if (where.status && p.status !== where.status) return false;
            if (where.type && p.type !== where.type) return false;
            return true;
          })
          .reduce(
            (acc, p) => acc.plus(p.amount instanceof Prisma.Decimal ? p.amount : dec(p.amount)),
            dec(0),
          );
        return { _sum: { amount: sum } };
      }),
    },
    invoice: {
      findFirst: jest.fn(async ({ where }: any) =>
        state.invoices.find(
          (i) => i.id === where.id && (!where.agencyId || i.agencyId === where.agencyId),
        ) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const inv = state.invoices.find((i) => i.id === where.id);
        Object.assign(inv, data);
        return inv;
      }),
    },
    // Tagged-template mock — the refund-race fix locks the invoice row via
    // `tx.$queryRaw`SELECT ... FOR UPDATE`` before re-checking net income.
    // The mocked Prisma has no real locking semantics, so this is a no-op
    // here; the race-closing behavior itself is proven by the ordering
    // tests below (netVerifiedIncomeCents reading tx state that reflects
    // an already-committed concurrent refund).
    $queryRaw: jest.fn().mockResolvedValue(undefined),
    // Supports both the callback form (money reconciliation) and the
    // array form (`Promise.all` of a findMany + count) that the paginated
    // findAllPending/findRecent envelope uses — same dual-shape mock
    // pattern as customers.service.spec.ts.
    $transaction: jest.fn((arg: any) =>
      typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
    ),
    ...overrides,
  };

  return { prisma, state };
}

function makeAnalytics() {
  return { calculateCarRoi: jest.fn().mockResolvedValue(undefined) };
}

function makeAuditLogs() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

describe('PaymentsService', () => {
  describe('create — partial income + reconcile', () => {
    it('records VERIFIED INCOME and marks invoice PARTIAL when underpaid', async () => {
      const { prisma, state } = makePrisma();
      state.invoices.push({
        id: 'inv-1',
        agencyId: 'ag-1',
        amount: dec(1000),
        status: 'DUE',
        booking: { carId: 'car-1' },
      });
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      const pay = await svc.create('ag-1', 'user-1', 'OWNER', {
        invoiceId: 'inv-1',
        amount: 400,
        type: 'INCOME',
        method: 'CASH',
      });

      expect(pay.status).toBe('VERIFIED');
      expect(state.invoices[0].status).toBe('PARTIAL');
    });

    it('marks invoice PAID when cumulative verified income covers the total', async () => {
      const { prisma, state } = makePrisma();
      state.invoices.push({
        id: 'inv-1',
        agencyId: 'ag-1',
        amount: dec(1000),
        status: 'DUE',
        booking: { carId: 'car-1' },
      });
      state.payments.push({
        id: 'pay-0',
        invoiceId: 'inv-1',
        amount: dec(600),
        status: 'VERIFIED',
        type: 'INCOME',
      });
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      await svc.create('ag-1', 'user-1', 'OWNER', {
        invoiceId: 'inv-1',
        amount: 400,
        type: 'INCOME',
      });

      expect(state.invoices[0].status).toBe('PAID');
    });

    it('rejects refunds that exceed net verified income', async () => {
      const { prisma, state } = makePrisma();
      state.invoices.push({
        id: 'inv-1',
        agencyId: 'ag-1',
        amount: dec(1000),
        status: 'PAID',
        booking: { carId: 'car-1' },
      });
      state.payments.push({
        id: 'pay-0',
        invoiceId: 'inv-1',
        amount: dec(1000),
        status: 'VERIFIED',
        type: 'INCOME',
      });
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      await expect(
        svc.create('ag-1', 'user-1', 'OWNER', {
          invoiceId: 'inv-1',
          amount: 1200,
          type: 'REFUND',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('REFUND race (audit 2026-07-26 #3): an auto-verified refund is re-checked under lock inside the transaction, not just by the outer pre-check', async () => {
      // Simulates the exact race: the outer advisory pre-check (outside any
      // transaction) sees "no refunds yet" and passes. By the time this
      // transaction acquires the invoice's row lock, a RIVAL refund of 700
      // MAD has already committed — leaving only 300 MAD of headroom, not
      // enough for this 500 MAD refund. Only the fix's in-transaction
      // re-check (added because of this finding) catches this; the old
      // single outside-tx check could not have, since it never re-read
      // after the rival committed.
      const { prisma, state } = makePrisma();
      state.invoices.push({
        id: 'inv-1',
        agencyId: 'ag-1',
        amount: dec(1000),
        status: 'PAID',
        booking: { carId: 'car-1' },
      });
      state.payments.push({
        id: 'pay-income',
        invoiceId: 'inv-1',
        amount: dec(1000),
        status: 'VERIFIED',
        type: 'INCOME',
      });

      let refundAggregateCalls = 0;
      prisma.payment.aggregate = jest.fn(async ({ where }: any) => {
        if (where.type === 'INCOME') {
          return { _sum: { amount: dec(1000) } };
        }
        refundAggregateCalls++;
        // Call #1 = the outer pre-check (sees 0 — plenty of room, passes).
        // Every call after = inside the transaction, after the rival's 700
        // MAD refund has "already committed".
        return { _sum: { amount: refundAggregateCalls === 1 ? dec(0) : dec(700) } };
      });

      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      await expect(
        svc.create('ag-1', 'user-1', 'OWNER', {
          invoiceId: 'inv-1',
          amount: 500,
          type: 'REFUND',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      // The whole point: the loser must never actually create its refund row.
      expect(state.payments.some((p) => p.type === 'REFUND')).toBe(false);
    });

    it('lands as PENDING when autoVerify is false', async () => {
      const { prisma, state } = makePrisma();
      state.invoices.push({
        id: 'inv-1',
        agencyId: 'ag-1',
        amount: dec(500),
        status: 'DUE',
        booking: { carId: 'car-1' },
      });
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      const pay = await svc.create('ag-1', 'user-1', 'OWNER', {
        invoiceId: 'inv-1',
        amount: 100,
        type: 'INCOME',
        autoVerify: false,
      });

      expect(pay.status).toBe('PENDING');
      expect(state.invoices[0].status).toBe('DUE');
    });

    it('404s for a foreign-agency invoice', async () => {
      const { prisma, state } = makePrisma();
      state.invoices.push({
        id: 'inv-x',
        agencyId: 'other',
        amount: dec(100),
        status: 'DUE',
        booking: {},
      });
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      await expect(
        svc.create('ag-1', 'user-1', 'OWNER', {
          invoiceId: 'inv-x',
          amount: 50,
          type: 'INCOME',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('verify', () => {
    it('rejects non-owner/manager roles', async () => {
      const { prisma } = makePrisma();
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);
      await expect(
        svc.verify('pay-1', 'u', 'AGENT', 'ag-1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('blocks double-verify', async () => {
      const { prisma, state } = makePrisma();
      state.payments.push({
        id: 'pay-1',
        status: 'VERIFIED',
        type: 'INCOME',
        amount: dec(100),
        invoiceId: 'inv-1',
        invoice: {
          agencyId: 'ag-1',
          amount: dec(100),
          booking: { carId: 'c1' },
        },
      });
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);
      await expect(
        svc.verify('pay-1', 'u', 'OWNER', 'ag-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    describe('REFUND race (audit 2026-07-26 #3)', () => {
      function pushRefundScenario(state: any) {
        state.invoices.push({
          id: 'inv-1',
          agencyId: 'ag-1',
          amount: dec(1000),
          status: 'PAID',
          booking: { carId: 'car-1' },
        });
        state.payments.push({
          id: 'pay-income',
          invoiceId: 'inv-1',
          amount: dec(1000),
          status: 'VERIFIED',
          type: 'INCOME',
        });
        state.payments.push({
          id: 'pay-refund',
          invoiceId: 'inv-1',
          amount: dec(300),
          status: 'PENDING',
          type: 'REFUND',
          invoice: { agencyId: 'ag-1', amount: dec(1000), booking: { carId: 'car-1' } },
        });
      }

      it('locks the invoice row (SELECT ... FOR UPDATE) before flipping a refund to VERIFIED', async () => {
        const { prisma, state } = makePrisma();
        pushRefundScenario(state);
        const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

        await svc.verify('pay-refund', 'u', 'OWNER', 'ag-1');

        expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
        // The lock must be acquired strictly before the row is written —
        // otherwise a concurrent transaction could still slip in between.
        const lockOrder = (prisma.$queryRaw as jest.Mock).mock.invocationCallOrder[0];
        const updateOrder = (prisma.payment.update as jest.Mock).mock.invocationCallOrder[0];
        expect(lockOrder).toBeLessThan(updateOrder);
      });

      it('rejects a refund that would exceed net income once a rival refund has already committed', async () => {
        // Simulates the loser of the race directly, in terms of end state:
        // a second refund (600 MAD) already landed as VERIFIED — this
        // transaction's own fresh, in-lock read of the aggregate must see
        // it and correctly refuse to also verify this 500 MAD refund
        // (400 MAD headroom remains, not enough).
        const { prisma, state } = makePrisma();
        state.invoices.push({
          id: 'inv-1',
          agencyId: 'ag-1',
          amount: dec(1000),
          status: 'PAID',
          booking: { carId: 'car-1' },
        });
        state.payments.push({
          id: 'pay-income',
          invoiceId: 'inv-1',
          amount: dec(1000),
          status: 'VERIFIED',
          type: 'INCOME',
        });
        state.payments.push({
          id: 'pay-refund-rival',
          invoiceId: 'inv-1',
          amount: dec(600),
          status: 'VERIFIED',
          type: 'REFUND',
        });
        state.payments.push({
          id: 'pay-refund-mine',
          invoiceId: 'inv-1',
          amount: dec(500),
          status: 'PENDING',
          type: 'REFUND',
          invoice: { agencyId: 'ag-1', amount: dec(1000), booking: { carId: 'car-1' } },
        });
        const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

        await expect(
          svc.verify('pay-refund-mine', 'u', 'OWNER', 'ag-1'),
        ).rejects.toBeInstanceOf(BadRequestException);

        // The whole point: this refund must never flip to VERIFIED.
        expect(
          state.payments.find((p) => p.id === 'pay-refund-mine')!.status,
        ).toBe('PENDING');
      });
    });
  });

  describe('findAllPending — list cap + pagination (P2 backlog)', () => {
    it('caps the result at 100 rows, same rationale as findRecent', async () => {
      const { prisma } = makePrisma();
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      await svc.findAllPending('ag-1');

      expect(prisma.payment.findMany.mock.calls[0][0].take).toBe(100);
      expect(prisma.payment.findMany.mock.calls[0][0].where).toEqual({
        status: 'PENDING',
        invoice: { agencyId: 'ag-1' },
      });
    });

    it('still returns a flat array when unpaginated, so old callers keep working', async () => {
      const { prisma } = makePrisma();
      prisma.payment.findMany.mockResolvedValueOnce([{ id: 'p1' }]);
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      await expect(svc.findAllPending('ag-1')).resolves.toEqual([{ id: 'p1' }]);
    });

    it('returns a paginated envelope only when page/limit are supplied', async () => {
      const { prisma } = makePrisma();
      prisma.payment.findMany.mockResolvedValueOnce([{ id: 'p1' }]);
      prisma.payment.count.mockResolvedValueOnce(240);
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      const result = await svc.findAllPending('ag-1', { page: 2, limit: 10 });

      expect(result).toEqual({ items: [{ id: 'p1' }], total: 240, page: 2, limit: 10 });
      expect(prisma.payment.findMany.mock.calls[0][0].skip).toBe(10); // (page-1)*limit
      expect(prisma.payment.findMany.mock.calls[0][0].take).toBe(10);
    });

    it('counts with the same WHERE the page is drawn from', async () => {
      const { prisma } = makePrisma();
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      await svc.findAllPending('ag-1', { page: 1, limit: 5 });

      expect(prisma.payment.count).toHaveBeenCalledWith({
        where: prisma.payment.findMany.mock.calls[0][0].where,
      });
    });
  });

  describe('findRecent — list cap + pagination (P2 backlog)', () => {
    it('caps the bare call at 100 rows, scoped to VERIFIED payments', async () => {
      const { prisma } = makePrisma();
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      await svc.findRecent('ag-1');

      expect(prisma.payment.findMany.mock.calls[0][0].take).toBe(100);
      expect(prisma.payment.findMany.mock.calls[0][0].where).toEqual({
        status: 'VERIFIED',
        invoice: { agencyId: 'ag-1' },
      });
    });

    it('still returns a flat array when unpaginated, so old callers keep working', async () => {
      const { prisma } = makePrisma();
      prisma.payment.findMany.mockResolvedValueOnce([{ id: 'p1' }]);
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      await expect(svc.findRecent('ag-1')).resolves.toEqual([{ id: 'p1' }]);
    });

    it('returns a paginated envelope only when page/limit are supplied', async () => {
      const { prisma } = makePrisma();
      prisma.payment.findMany.mockResolvedValueOnce([{ id: 'p1' }]);
      prisma.payment.count.mockResolvedValueOnce(530);
      const svc = new PaymentsService(prisma, makeAnalytics() as any, makeAuditLogs() as any);

      const result = await svc.findRecent('ag-1', { page: 3, limit: 50 });

      expect(result).toEqual({ items: [{ id: 'p1' }], total: 530, page: 3, limit: 50 });
      expect(prisma.payment.findMany.mock.calls[0][0].skip).toBe(100); // (page-1)*limit
      expect(prisma.payment.findMany.mock.calls[0][0].take).toBe(50);
    });
  });
});
