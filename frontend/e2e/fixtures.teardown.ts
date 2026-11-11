import { test as teardown } from '@playwright/test';
import fs from 'node:fs';
import { STORAGE_STATE } from '../playwright.config';
import { fixtureAccount, fixtureDatabase, type FixtureRole } from './fixtures';

teardown('remove only this run’s fixture data and browser credentials', async () => {
  const { prisma } = fixtureDatabase();
  const emails = (['ROOT_ADMIN', 'OWNER', 'MANAGER', 'AGENT', 'RENTER'] as FixtureRole[])
    .map((role) => fixtureAccount(role).email);
  try {
    const owner = await prisma.user.findUnique({ where: { email: fixtureAccount('OWNER').email } });
    if (owner?.agencyId) {
      const agencyId = owner.agencyId;
      const customers = await prisma.customer.findMany({ where: { agencyId }, select: { renterIdentityId: true } });
      const identityIds = customers.map((customer: { renterIdentityId: string | null }) => customer.renterIdentityId)
        .filter((id: string | null): id is string => id !== null);
      await prisma.$transaction(async (tx: typeof prisma) => {
        // Network records deliberately survive real agency deletion. Fixture
        // records must be removed explicitly before cascading this test agency.
        await tx.blacklistEntry.deleteMany({ where: { agencyId } });
        await tx.renterReview.deleteMany({ where: { agencyId } });
        await tx.refusalLog.deleteMany({ where: { agencyId } });
        await tx.booking.deleteMany({ where: { agencyId } });
        await tx.vaultFile.deleteMany({ where: { agencyId } });
        await tx.diagnosticSession.deleteMany({ where: { agencyId } });
        await tx.diagnosticVehicle.deleteMany({ where: { agencyId } });
        await tx.car.deleteMany({ where: { agencyId } });
        await tx.agency.delete({ where: { id: agencyId } });
        await tx.renterIdentity.deleteMany({
          where: { id: { in: identityIds }, customers: { none: {} }, users: { none: {} },
            reviews: { none: {} }, blacklistEntries: { none: {} } },
        });
      });
    }
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  } finally {
    await prisma.$disconnect();
    fs.rmSync(STORAGE_STATE, { force: true });
  }
});
