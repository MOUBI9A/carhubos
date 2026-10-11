/**
 * Idempotent seed that guarantees ONE login account per role, so every user
 * type (platform owner, agency owner, manager, agent, renter) can sign in.
 * All accounts share the password `admin123`. Safe to run repeatedly.
 *
 *   node prisma/seed-roles.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// Mirrors src/common/capabilities.ts ROLE_PRESETS — see the sync warning there.
const { ROLE_PRESETS } = require('./capability-presets');

let prisma;

async function getConnectedPrisma(maxRetries = 10, delay = 500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = new PrismaClient();
    try {
      await client.$connect();
      return client;
    } catch (err) {
      await client.$disconnect().catch(() => {});
      if (attempt === maxRetries) throw err;
      console.warn(`Connection attempt ${attempt} failed, retrying...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// Mirror of trust.service.ts identity derivation: HMAC-SHA256(IDENTITY_PEPPER,
// normalize(type:number)). When the pepper is present (seed runs with
// `-r dotenv/config`) this matches a real trust lookup for the same CIN; if it
// is absent we fall back to a deterministic demo digest so seeding never fails.
function demoIdentityHash(type, number) {
  const norm = `${(type || 'CIN').toUpperCase().trim()}:${(number || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')}`;
  const pepper = process.env.IDENTITY_PEPPER;
  if (pepper && pepper.trim() !== '') {
    return crypto.createHmac('sha256', pepper).update(norm).digest('hex');
  }
  return crypto.createHash('sha256').update(`DEMO_VAULT_${norm}`).digest('hex');
}

async function main() {
  prisma = await getConnectedPrisma();
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

  let renterUser = null;
  let ownerUser = null;
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
    if (a.role === 'RENTER') renterUser = user;
    if (a.role === 'OWNER') ownerUser = user;
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

  // Give the demo renter a global trust identity + a global document vault, so
  // the renter portal shows a vault and consent grants return real documents.
  // Idempotent: RenterIdentity upserts on its unique hash; vault docs are
  // created only when absent (no unique key on (owner,type)).
  if (renterUser) {
    const demoCin = 'BE894512';
    const identityHash = demoIdentityHash('CIN', demoCin);
    const identity = await prisma.renterIdentity.upsert({
      where: { identityHash },
      update: {},
      create: {
        identityHash,
        identityType: 'CIN',
        identityMasked: 'B••••12',
        globalScore: 4.6,
        reviewCount: 7,
        riskLevel: 'TRUSTED',
      },
    });
    // Link the identity and provision a stable Trust Vault QR token so the
    // portal QR/badge + the agency's consent-request-by-QR flow work E2E.
    // qrHash is @unique; a fixed demo token keeps reseeds idempotent.
    const DEMO_QR = 'FDR-VAULT-SAMI-8F2A4C7E';
    const patch = {};
    if (renterUser.renterIdentityId !== identity.id) patch.renterIdentityId = identity.id;
    if (!renterUser.qrHash) patch.qrHash = DEMO_QR;
    if (Object.keys(patch).length > 0) {
      renterUser = await prisma.user.update({
        where: { id: renterUser.id },
        data: patch,
      });
    }

    const vault = [
      { type: 'CIN_FRONT', label: 'National ID (front)', fileUrl: 'https://demo.fider.local/vault/cin-front.jpg', verified: true },
      { type: 'DRIVING_LICENSE', label: 'Driving licence', fileUrl: 'https://demo.fider.local/vault/permis.jpg', verified: true },
    ];
    let added = 0;
    for (const d of vault) {
      const existing = await prisma.renterDocument.findFirst({
        where: { ownerUserId: renterUser.id, type: d.type },
      });
      if (!existing) {
        await prisma.renterDocument.create({ data: { ...d, ownerUserId: renterUser.id } });
        added++;
      }
    }
    console.log(
      `  ✓ renter vault: RenterIdentity (${identity.riskLevel}) linked + ${vault.length} RenterDocuments (${added} new) for ${renterUser.email}`,
    );

    // Seed a PENDING consent request from the demo agency so the renter portal
    // opens with something to review out of the box (log in as renter → approve
    // → the agency can then read the vault). Idempotent: only when the renter
    // has no consent grant at all yet.
    const existingGrant = await prisma.consentGrant.findFirst({
      where: { grantorUserId: renterUser.id },
    });
    if (!existingGrant) {
      const grant = await prisma.consentGrant.create({
        data: {
          grantorUserId: renterUser.id,
          agencyId: agency.id,
          requestedByUserId: ownerUser?.id ?? null,
          scope: ['CIN_FRONT', 'DRIVING_LICENSE'],
          status: 'PENDING',
        },
      });
      await prisma.notification.create({
        data: {
          userId: renterUser.id,
          type: 'CONSENT_REQUESTED',
          title: `${agency.name} requests access to your documents`,
          body: 'Requested document access: CIN_FRONT, DRIVING_LICENSE.',
          relatedType: 'ConsentGrant',
          relatedId: grant.id,
        },
      });
      console.log(`  ✓ seeded a PENDING consent request + notification for ${renterUser.email}`);
    }
  }

  console.log('\nRole accounts ready (password: admin123).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma?.$disconnect());
