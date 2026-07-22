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
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
    ...overrides,
  };

  return { prisma, state };
}

function makeAnalytics() {
  return { calculateCarRoi: jest.fn().mockResolvedValue(undefined) };
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
      const svc = new PaymentsService(prisma, makeAnalytics() as any);

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
      const svc = new PaymentsService(prisma, makeAnalytics() as any);

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
      const svc = new PaymentsService(prisma, makeAnalytics() as any);

      await expect(
        svc.create('ag-1', 'user-1', 'OWNER', {
          invoiceId: 'inv-1',
          amount: 1200,
          type: 'REFUND',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
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
      const svc = new PaymentsService(prisma, makeAnalytics() as any);

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
      const svc = new PaymentsService(prisma, makeAnalytics() as any);

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
      const svc = new PaymentsService(prisma, makeAnalytics() as any);
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
      const svc = new PaymentsService(prisma, makeAnalytics() as any);
      await expect(
        svc.verify('pay-1', 'u', 'OWNER', 'ag-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAllPending — list cap (P2 backlog)', () => {
    it('caps the result at 100 rows, same rationale as findRecent', async () => {
      const { prisma } = makePrisma();
      const svc = new PaymentsService(prisma, makeAnalytics() as any);

      await svc.findAllPending('ag-1');

      expect(prisma.payment.findMany.mock.calls[0][0].take).toBe(100);
      expect(prisma.payment.findMany.mock.calls[0][0].where).toEqual({
        status: 'PENDING',
        invoice: { agencyId: 'ag-1' },
      });
    });
  });
});
