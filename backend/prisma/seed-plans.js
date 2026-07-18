/**
 * Phase 11 seed — SaaS plan catalog + subscription backfill. Idempotent; safe to
 * re-run and safe to run after seed.js / seed-roles.js. Does NOT wipe anything.
 *
 *   node -r dotenv/config prisma/seed-plans.js
 *
 * 1. Upserts the 4 plans (BETA/STARTER/PRO/BUSINESS) on their unique key.
 * 2. Backfills every live agency (deletedAt = null) that has no subscription with
 *    an ACTIVE BETA subscription (trialEndsAt = now + 14d) and mirrors
 *    Agency.subscriptionTier = 'BETA'.
 */
const { PrismaClient } = require('@prisma/client');
const {
  PLAN_CATALOG,
  DEFAULT_PLAN_KEY,
  TRIAL_DAYS,
} = require('./plan-catalog');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SaaS plans…');

  // 1. Plan catalog (idempotent on `key`).
  for (const p of PLAN_CATALOG) {
    await prisma.plan.upsert({
      where: { key: p.key },
      update: {
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        maxCars: p.maxCars,
        maxStaff: p.maxStaff,
        maxBookingsPerMonth: p.maxBookingsPerMonth,
        features: p.features,
        isPublic: p.isPublic,
        sortOrder: p.sortOrder,
      },
      create: {
        key: p.key,
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        maxCars: p.maxCars,
        maxStaff: p.maxStaff,
        maxBookingsPerMonth: p.maxBookingsPerMonth,
        features: p.features,
        isPublic: p.isPublic,
        sortOrder: p.sortOrder,
      },
    });
    const limits = [
      p.maxCars ?? '∞',
      p.maxStaff ?? '∞',
      p.maxBookingsPerMonth ?? '∞',
    ].join(' / ');
    console.log(
      `  ✓ plan ${p.key.padEnd(9)} ${p.priceMonthly} MAD/mo  · cars/staff/bkg ${limits}`,
    );
  }

  const beta = await prisma.plan.findUnique({
    where: { key: DEFAULT_PLAN_KEY },
  });

  // 2. Backfill: every live agency without a subscription gets an ACTIVE BETA one.
  const agencies = await prisma.agency.findMany({
    where: { deletedAt: null, subscription: null },
    select: { id: true, name: true },
  });

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  let created = 0;
  for (const a of agencies) {
    await prisma.subscription.create({
      data: {
        agencyId: a.id,
        planId: beta.id,
        status: 'ACTIVE', // free during beta — operate immediately, no dunning
        trialEndsAt,
        currentPeriodStart: now,
        note: 'Auto-provisioned on the Fider beta plan.',
      },
    });
    await prisma.agency.update({
      where: { id: a.id },
      data: { subscriptionTier: DEFAULT_PLAN_KEY },
    });
    created++;
  }

  console.log(
    `  ✓ subscriptions: ${created} agency(ies) backfilled onto ${DEFAULT_PLAN_KEY} (${agencies.length === 0 ? 'all already had one' : 'trial ends ' + trialEndsAt.toISOString().slice(0, 10)})`,
  );
  console.log('\nSaaS plans + subscriptions ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
