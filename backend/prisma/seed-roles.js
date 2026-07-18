/**
 * Idempotent seed that guarantees ONE login account per role, so every user
 * type (platform owner, agency owner, manager, agent, renter) can sign in.
 * All accounts share the password `admin123`. Safe to run repeatedly.
 *
 *   node prisma/seed-roles.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
// Mirrors src/common/capabilities.ts ROLE_PRESETS — see the sync warning there.
const { ROLE_PRESETS } = require('./capability-presets');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);

  // A shared demo agency for the agency-scoped roles (owner/manager/agent).
  const agency = await prisma.agency.upsert({
    where: { contactEmail: 'demo@carhub.os' },
    update: {},
    create: {
      name: 'CarHub Demo Agency',
      city: 'Casablanca',
      contactEmail: 'demo@carhub.os',
      subscriptionTier: 'BUSINESS',
      status: 'ACTIVE',
    },
  });

  const accounts = [
    { email: 'root@carhub.os', name: 'Platform Owner', role: 'ROOT_ADMIN', agencyId: null },
    { email: 'owner@carhub.os', name: 'Agency Owner', role: 'OWNER', agencyId: agency.id },
    { email: 'manager@carhub.os', name: 'Agency Manager', role: 'MANAGER', agencyId: agency.id },
    { email: 'agent@carhub.os', name: 'Rental Agent', role: 'AGENT', agencyId: agency.id },
    { email: 'renter@carhub.os', name: 'Sami Renter', role: 'RENTER', agencyId: null, trustScore: 82, isVerified: true },
  ];

  for (const a of accounts) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { password, role: a.role, name: a.name, agencyId: a.agencyId ?? null },
      create: {
        email: a.email,
        password,
        name: a.name,
        role: a.role,
        agencyId: a.agencyId ?? null,
        ...(a.trustScore ? { trustScore: a.trustScore } : {}),
        ...(a.isVerified ? { isVerified: a.isVerified } : {}),
      },
    });
    console.log(`  ✓ ${a.role.padEnd(11)} ${a.email}  /  admin123`);

    // Agency-scoped roles need an AgencyMembership or CapabilitiesGuard 403s
    // every gated endpoint. Idempotent on the {userId, agencyId} unique key.
    if (a.agencyId && ROLE_PRESETS[a.role]) {
      await prisma.agencyMembership.upsert({
        where: { userId_agencyId: { userId: user.id, agencyId: a.agencyId } },
        update: { rolePreset: a.role, capabilities: ROLE_PRESETS[a.role] },
        create: {
          userId: user.id,
          agencyId: a.agencyId,
          rolePreset: a.role,
          capabilities: ROLE_PRESETS[a.role],
        },
      });
      console.log(`    ↳ membership: ${a.role} preset (${ROLE_PRESETS[a.role].length} capabilities)`);
    }
  }

  // Populate the demo agency with a small fleet + customers so the owner and
  // manager land on a dashboard with real data (idempotent: only if empty).
  const existingCars = await prisma.car.count({ where: { agencyId: agency.id } });
  if (existingCars === 0) {
    const cars = [
      { brand: 'Dacia', model: 'Duster', year: 2023, licensePlate: 'DEMO-101-A', pricePerDay: 450, status: 'AVAILABLE', mileage: 32000 },
      { brand: 'Renault', model: 'Clio 5', year: 2024, licensePlate: 'DEMO-102-A', pricePerDay: 350, status: 'AVAILABLE', mileage: 12000 },
      { brand: 'Volkswagen', model: 'Golf 8', year: 2023, licensePlate: 'DEMO-103-A', pricePerDay: 600, status: 'RENTED', mileage: 28000 },
      { brand: 'Hyundai', model: 'Tucson', year: 2024, licensePlate: 'DEMO-104-A', pricePerDay: 900, status: 'AVAILABLE', mileage: 8000 },
    ];
    for (const c of cars) {
      await prisma.car.create({ data: { ...c, agencyId: agency.id } });
    }

    const customers = [
      { firstName: 'Karim', lastName: 'Bennani', phone: '+212661112233', identityType: 'CIN', identityNumber: 'DEMOK1122', status: 'ACTIVE' },
      { firstName: 'Salma', lastName: 'Idrissi', phone: '+212662223344', identityType: 'CIN', identityNumber: 'DEMOS3344', email: 'salma@example.ma', status: 'ACTIVE' },
      { firstName: 'Omar', lastName: 'Fassi', phone: '+212663334455', identityType: 'PASSPORT', identityNumber: 'DEMOP5566', status: 'ACTIVE' },
    ];
    for (const cu of customers) {
      await prisma.customer.create({ data: { ...cu, agencyId: agency.id } });
    }
    console.log(`  ✓ seeded ${cars.length} cars + ${customers.length} customers into the demo agency`);
  }

  console.log('\nRole accounts ready (password: admin123).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
