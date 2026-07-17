/**
 * Seeds cross-tenant Trust Network data so the Client Risk Assessment panel
 * shows all four states for the demo agency's customers. The key idea: a
 * DIFFERENT agency (Prestige) reviewed / flagged the SAME physical person, so
 * when the demo owner opens a booking, they see another agency's history.
 *
 *   node prisma/seed-trust.js   (run after seed-roles.js + /trust/backfill)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.agency.findUnique({ where: { contactEmail: 'demo@carhub.os' } });
  if (!demo) throw new Error('Demo agency missing — run seed-roles.js first');

  // A reviewer agency (Prestige, from seed.js) that will have "rented" to these
  // people before. Fall back to any other agency with a car.
  let reviewer = await prisma.agency.findFirst({ where: { name: { contains: 'Prestige' } } });
  if (!reviewer) reviewer = await prisma.agency.findFirst({ where: { id: { not: demo.id } } });
  if (!reviewer) throw new Error('Need a second agency to act as the reviewer');

  let reviewerCar = await prisma.car.findFirst({ where: { agencyId: reviewer.id } });
  if (!reviewerCar) {
    reviewerCar = await prisma.car.create({
      data: { brand: 'Seed', model: 'Reviewer', year: 2023, licensePlate: `REVW-${Date.now()}`, pricePerDay: 400, agencyId: reviewer.id },
    });
  }

  // Wipe existing trust demo data for a clean, idempotent re-seed.
  await prisma.renterReview.deleteMany({});
  await prisma.blacklistEntry.deleteMany({});

  // The demo customers we'll shape (by their seeded identityNumber).
  const plan = [
    { idn: 'DEMOK1122', outcome: 'TRUSTED' },
    { idn: 'DEMOS3344', outcome: 'CAUTION' },
    { idn: 'DEMOP5566', outcome: 'BLACKLISTED' },
  ];

  const past = (daysAgo) => new Date(Date.now() - daysAgo * 24 * 3600 * 1000);

  for (const p of plan) {
    const demoCustomer = await prisma.customer.findFirst({
      where: { agencyId: demo.id, identityNumber: p.idn },
    });
    if (!demoCustomer || !demoCustomer.renterIdentityId) {
      console.log(`  ! skip ${p.idn} (not found / not linked — did /trust/backfill run?)`);
      continue;
    }
    const identityId = demoCustomer.renterIdentityId;

    // A mirror of the same person at the reviewer agency, sharing the identity.
    const mirror = await prisma.customer.upsert({
      where: { agencyId_identityNumber: { agencyId: reviewer.id, identityNumber: p.idn } },
      update: { renterIdentityId: identityId },
      create: {
        firstName: demoCustomer.firstName,
        lastName: demoCustomer.lastName,
        phone: demoCustomer.phone,
        identityType: demoCustomer.identityType,
        identityNumber: p.idn,
        agencyId: reviewer.id,
        renterIdentityId: identityId,
      },
    });
    // Clean prior seed bookings for this mirror customer.
    await prisma.booking.deleteMany({ where: { customerId: mirror.id } });

    const makeBooking = async (daysAgo) =>
      prisma.booking.create({
        data: {
          startDate: past(daysAgo + 4),
          endDate: past(daysAgo),
          totalPrice: 1600,
          status: 'COMPLETED',
          carId: reviewerCar.id,
          customerId: mirror.id,
          agencyId: reviewer.id,
        },
      });

    if (p.outcome === 'TRUSTED') {
      const specs = [
        { d: 20, r: 5, t: ['PERFECT_RENTER', 'EARLY_RETURN'], c: 'Impeccable — returned a day early with a full tank.' },
        { d: 55, r: 5, t: ['POLITE', 'CLEAN_RETURN'], c: 'Polite, careful driver. Car spotless.' },
        { d: 96, r: 5, t: ['REPEAT_CLIENT'], c: 'Fourth rental, always flawless.' },
        { d: 140, r: 4, t: ['LATE_RETURN'], c: 'One hour late but communicated ahead.' },
      ];
      for (const s of specs) {
        const b = await makeBooking(s.d);
        await prisma.renterReview.create({
          data: { rating: s.r, tags: JSON.stringify(s.t), comment: s.c, identityId, bookingId: b.id, agencyId: reviewer.id, createdAt: past(s.d) },
        });
      }
    } else if (p.outcome === 'CAUTION') {
      const specs = [
        { d: 30, r: 2, t: ['LATE_RETURN', 'SMOKED_IN_CAR'], c: 'Returned six hours late; car smelled of cigarettes.' },
        { d: 80, r: 3, t: ['LATE_RETURN'], c: 'Late again, otherwise fine.' },
        { d: 150, r: 3, t: ['POLITE'], c: 'Polite but slow to return.' },
      ];
      for (const s of specs) {
        const b = await makeBooking(s.d);
        await prisma.renterReview.create({
          data: { rating: s.r, tags: JSON.stringify(s.t), comment: s.c, identityId, bookingId: b.id, agencyId: reviewer.id, createdAt: past(s.d) },
        });
      }
    } else if (p.outcome === 'BLACKLISTED') {
      // One CRITICAL flag (hard-blocks booking) + one poor review for context.
      const b = await makeBooking(120);
      await prisma.renterReview.create({
        data: { rating: 1, tags: JSON.stringify(['UNPAID_DAMAGE']), comment: 'Major unpaid damage on return.', identityId, bookingId: b.id, agencyId: reviewer.id, createdAt: past(120) },
      });
      await prisma.blacklistEntry.create({
        data: {
          reason: 'FRAUDULENT_DOCUMENTS',
          severity: 'CRITICAL',
          details: 'Presented a falsified international driving permit and attempted to pay the deposit with a cloned card. Police report filed.',
          evidenceUrls: JSON.stringify(['evidence-1.jpg', 'police-report.pdf']),
          status: 'ACTIVE',
          identityId,
          agencyId: reviewer.id,
          createdAt: past(127),
        },
      });
    }
    console.log(`  ✓ ${p.idn} -> ${p.outcome}  (reviewed by ${reviewer.name})`);
  }

  console.log('\nTrust Network demo data ready. Reviewer agency:', reviewer.name);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
