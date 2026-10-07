import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ROLE_PRESETS } from '../src/common/capabilities';

const live = process.env.CARHUB_LIVE_OVERRIDE_CHECK === '1' ? describe : describe.skip;

live('Trust override against the running local API and PostgreSQL', () => {
  const prisma = new PrismaClient();
  const agencyId = randomUUID();
  const identityId = randomUUID();
  const carId = randomUUID();
  const customerId = randomUUID();
  const flagId = randomUUID();
  const contactEmail = `override-${agencyId}@example.invalid`;
  const identityHash = `override-test-${identityId}`;
  const password = randomUUID();
  const tokens = new Map<string, string>();
  const users = new Map<string, string>();
  const api = process.env.CARHUB_LIVE_API_URL || 'http://localhost:5406/api';
  const payload = {
    carId, customerId, startDate: '2099-10-01', endDate: '2099-10-03',
    overrideReason: '  Identity and deposit verified  ',
  };
  let connected = false;

  async function post(path: string, data: unknown, role?: string) {
    return fetch(`${api}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(role ? { Authorization: `Bearer ${tokens.get(role)}` } : {}),
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10_000),
    });
  }

  async function financialCounts() {
    return Promise.all([
      prisma.booking.count({ where: { agencyId } }),
      prisma.invoice.count({ where: { agencyId } }),
      prisma.payment.count({ where: { invoice: { agencyId } } }),
      prisma.auditLog.count({ where: { agencyId, action: 'TRUST_OVERRIDE' } }),
    ]);
  }

  beforeAll(async () => {
    const localHosts = ['localhost', '127.0.0.1', '[::1]'];
    if (!localHosts.includes(new URL(api).hostname) ||
        !localHosts.includes(new URL(process.env.DATABASE_URL || '').hostname)) {
      throw new Error('Live override checks are restricted to local API and database hosts.');
    }
    await prisma.$connect();
    connected = true;
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (transaction) => {
      await transaction.agency.create({ data: { id: agencyId, name: 'Temporary override verification', contactEmail } });
      await transaction.renterIdentity.create({
        data: { id: identityId, identityHash, identityType: 'CIN', identityMasked: 'TEST', riskLevel: 'HIGH', activeFlagCount: 1 },
      });
      await transaction.customer.create({
        data: { id: customerId, agencyId, firstName: 'Temporary', lastName: 'Renter', phone: '0600000000', identityNumber: identityHash, renterIdentityId: identityId },
      });
      await transaction.car.create({
        data: { id: carId, agencyId, brand: 'Test', model: 'Override', year: 2026, licensePlate: `TEST-${carId}`, pricePerDay: 350 },
      });
      await transaction.blacklistEntry.create({
        data: { id: flagId, agencyId, identityId, reason: 'OTHER', severity: 'HIGH', details: 'Temporary automated verification fixture' },
      });
      for (const role of ['OWNER', 'MANAGER', 'AGENT']) {
        const user = await transaction.user.create({
          data: {
            agencyId, role, name: `Temporary ${role}`, password: hashedPassword,
            email: `${role.toLowerCase()}-${agencyId}@example.invalid`,
            memberships: { create: { agencyId, rolePreset: role, capabilities: ROLE_PRESETS[role] } },
          },
        });
        users.set(role, user.id);
      }
    });
    for (const role of users.keys()) {
      const response = await post('/auth/login', {
        email: `${role.toLowerCase()}-${agencyId}@example.invalid`, password,
      });
      expect(response.status).toBe(200);
      const session = await response.json() as { access_token: string };
      expect(typeof session.access_token).toBe('string');
      tokens.set(role, session.access_token);
    }
  }, 30_000);

  afterAll(async () => {
    try {
      if (connected) {
        await prisma.$transaction(async (transaction) => {
          await transaction.booking.deleteMany({ where: { agencyId } });
          await transaction.agency.deleteMany({ where: { id: agencyId, contactEmail } });
          await transaction.renterIdentity.deleteMany({ where: { id: identityId, identityHash } });
        });
        expect(await financialCounts()).toEqual([0, 0, 0, 0]);
        expect(await prisma.agency.count({ where: { id: agencyId } })).toBe(0);
        expect(await prisma.user.count({ where: { agencyId } })).toBe(0);
        expect(await prisma.renterIdentity.count({ where: { id: identityId } })).toBe(0);
        expect(await prisma.blacklistEntry.count({ where: { id: flagId } })).toBe(0);
      }
    } catch (error) {
      console.error('Temporary fixture cleanup failed', { agencyId, identityId });
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  });

  it('rejects agent overrides over HTTP without financial writes', async () => {
    const response = await post('/bookings', payload, 'AGENT');
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'TRUST_OVERRIDE_FORBIDDEN' });
    expect(await financialCounts()).toEqual([0, 0, 0, 0]);
  });

  it('rejects forged authority fields at the validation boundary', async () => {
    const response = await post('/bookings', { ...payload, role: 'ROOT_ADMIN', agencyId }, 'AGENT');
    expect(response.status).toBe(400);
    expect(await financialCounts()).toEqual([0, 0, 0, 0]);
  });

  it('rejects owner whitespace-only reasons without financial writes', async () => {
    const response = await post('/bookings', { ...payload, overrideReason: '  \t ' }, 'OWNER');
    expect(response.status).toBe(403);
    expect(await financialCounts()).toEqual([0, 0, 0, 0]);
  });

  it('uses the current membership instead of a stale manager token', async () => {
    const where = { userId_agencyId: { userId: users.get('MANAGER')!, agencyId } };
    await prisma.agencyMembership.update({ where, data: { rolePreset: 'AGENT' } });
    try {
      const response = await post('/bookings', payload, 'MANAGER');
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: 'TRUST_OVERRIDE_FORBIDDEN' });
      expect(await financialCounts()).toEqual([0, 0, 0, 0]);
    } finally {
      await prisma.agencyMembership.update({ where, data: { rolePreset: 'MANAGER' } });
    }
  });

  it('still requires booking.create even for an owner preset', async () => {
    const where = { userId_agencyId: { userId: users.get('OWNER')!, agencyId } };
    await prisma.agencyMembership.update({ where, data: { capabilities: [] } });
    try {
      const response = await post('/bookings', payload, 'OWNER');
      expect(response.status).toBe(403);
      expect(await financialCounts()).toEqual([0, 0, 0, 0]);
    } finally {
      await prisma.agencyMembership.update({ where, data: { capabilities: ROLE_PRESETS.OWNER } });
    }
  });

  it.each([
    ['OWNER', '2099-10-01', '2099-10-03'],
    ['MANAGER', '2099-11-01', '2099-11-03'],
  ])('allows %s and persists the correct invoice, payment and override audit', async (role, startDate, endDate) => {
    const response = await post('/bookings', { ...payload, startDate, endDate }, role);
    expect(response.status).toBe(201);
    const created = await response.json() as { id: string };
    const booking = await prisma.booking.findFirstOrThrow({ where: { id: created.id, agencyId } });
    expect(booking.status).toBe('REQUESTED');
    expect(booking.totalPrice.toFixed(2)).toBe('700.00');
    const invoice = await prisma.invoice.findFirstOrThrow({ where: { bookingId: booking.id, agencyId } });
    expect(invoice.amount.toFixed(2)).toBe('700.00');
    expect(invoice.taxAmount.toFixed(2)).toBe('116.67');
    const payment = await prisma.payment.findFirstOrThrow({ where: { invoiceId: invoice.id } });
    expect(payment.status).toBe('PENDING');
    expect(payment.amount.toFixed(2)).toBe('700.00');
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { agencyId, actorId: users.get(role), action: 'TRUST_OVERRIDE', entityId: customerId },
    });
    expect(JSON.parse(audit.afterState!)).toMatchObject({ flagId, overrideReason: 'Identity and deposit verified' });
  });

  it('allows ordinary agent bookings once the temporary flag is lifted', async () => {
    await prisma.blacklistEntry.update({ where: { id: flagId }, data: { status: 'LIFTED' } });
    const response = await post('/bookings', {
      carId, customerId, startDate: '2099-12-01', endDate: '2099-12-03',
    }, 'AGENT');
    expect(response.status).toBe(201);
    expect(await financialCounts()).toEqual([3, 3, 3, 2]);
  });
});
