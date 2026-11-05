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

const prisma = new PrismaClient();

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
  const password = await bcrypt.hash('admin123', 10);

  // A shared demo agency for the agency-scoped roles (owner/manager/agent).
  const agency = await prisma.agency.upsert({
    where: { contactEmail: 'demo@carhub.os' },
    update: {
      onboardingStatus: 'COMPLETED',
      onboardingCompletedAt: new Date(),
    },
    create: {
      name: 'CarHub Demo Agency',
      city: 'Casablanca',
      contactEmail: 'demo@carhub.os',
      subscriptionTier: 'BUSINESS',
      status: 'ACTIVE',
      onboardingStatus: 'COMPLETED',
      onboardingCompletedAt: new Date(),
    },
  });

  const accounts = [
    { email: 'root@carhub.os', name: 'Platform Owner', role: 'ROOT_ADMIN', agencyId: null, isVerified: true },
    { email: 'owner@carhub.os', name: 'Agency Owner', role: 'OWNER', agencyId: agency.id, isVerified: true },
    { email: 'manager@carhub.os', name: 'Agency Manager', role: 'MANAGER', agencyId: agency.id, isVerified: true },
    { email: 'agent@carhub.os', name: 'Rental Agent', role: 'AGENT', agencyId: agency.id, isVerified: true },
    { email: 'renter@carhub.os', name: 'Sami Renter', role: 'RENTER', agencyId: null, trustScore: 82, isVerified: true },
  ];

  let renterUser = null;
  let ownerUser = null;
  for (const a of accounts) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: {
        password,
        role: a.role,
        name: a.name,
        agencyId: a.agencyId ?? null,
        isVerified: true,
        emailVerifiedAt: new Date(),
      },
      create: {
        email: a.email,
        password,
        name: a.name,
        role: a.role,
        agencyId: a.agencyId ?? null,
        isVerified: true,
        emailVerifiedAt: new Date(),
        ...(a.trustScore ? { trustScore: a.trustScore } : {}),
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

  // Populate the demo agency with a representative 112-vehicle Moroccan
  // rental fleet. The plate range is deterministic so this remains idempotent
  // and only fills missing demo vehicles on later runs.
  const legacyDemoFleetImages = [
    'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=85',
  ];
  const demoFleetImages = [
    'https://images.unsplash.com/photo-1421091242698-34f6ad7fc088?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1471958680802-1345a694ba6d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1478059299873-f047d8c5fe1a?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1486673748761-a8d18475c757?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1507679252487-e3db58b1642e?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1514179974491-a7885781ed87?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1519817914152-22d216bb9170?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1522255272218-7ac5249be344?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1523496922380-91d5afba98a3?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1529369623266-f5264b696110?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1542242476-5a3565835a38?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1546614042-7df3c24c9e5d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1549439602-43ebca2327af?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1557598628-bdd7d0767917?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1559385301-0187cb6eff46?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1560009320-c01920eef9f8?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1566625147574-b1cf1ff6cf7d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1567808291548-fc3ee04dbcf0?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1582639510494-c80b5de9f148?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1585503418537-88331351ad99?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1591363748916-d7f3f2df01b0?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1598248691267-4a62dfdfd8a8?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1612057473166-af2affdb92ad?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1612287970084-4eb0bc4d4e34?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1612563893490-d86ed296e5e6?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1615063029891-497bebd4f03c?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1620998258282-bc3bd5fee9e9?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1622893288761-823ba60f17a6?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1630165356623-266076eaceb6?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1630587148265-761cbd139043?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1650959818516-03d68079f9a0?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1674719645138-c3fd1aaf8307?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1675957421588-bbe528181589?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1694649686884-0d62d0dc47d1?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1705624843697-4461f9dce482?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1712885046114-5ea81a2f7555?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1757922588932-cb0fa4dda952?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1757922589576-129377dadac9?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1758692513983-ebf181d2ec2a?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1758915753451-b478b4e6f920?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1759310347910-091a3f3c26e6?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1760261799672-2469a6c4c6f3?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1760690344266-966d1bf7c46c?auto=format&fit=crop&w=1200&q=85',
  ];
  const demoFleetCatalog = [
    ['Dacia', 'Duster', 450, 'DIESEL', 'MANUAL'],
    ['Dacia', 'Logan', 280, 'PETROL', 'MANUAL'],
    ['Dacia', 'Sandero', 300, 'PETROL', 'MANUAL'],
    ['Dacia', 'Jogger', 520, 'HYBRID', 'AUTOMATIC'],
    ['Renault', 'Clio 5', 350, 'PETROL', 'MANUAL'],
    ['Renault', 'Megane', 480, 'DIESEL', 'MANUAL'],
    ['Renault', 'Captur', 550, 'PETROL', 'AUTOMATIC'],
    ['Renault', 'Arkana', 680, 'HYBRID', 'AUTOMATIC'],
    ['Peugeot', '208', 360, 'PETROL', 'MANUAL'],
    ['Peugeot', '308', 520, 'DIESEL', 'AUTOMATIC'],
    ['Peugeot', '2008', 580, 'PETROL', 'AUTOMATIC'],
    ['Peugeot', '3008', 760, 'DIESEL', 'AUTOMATIC'],
    ['Citroen', 'C3', 330, 'PETROL', 'MANUAL'],
    ['Citroen', 'C4', 470, 'PETROL', 'AUTOMATIC'],
    ['Citroen', 'C5 Aircross', 700, 'DIESEL', 'AUTOMATIC'],
    ['Volkswagen', 'Polo', 420, 'PETROL', 'AUTOMATIC'],
    ['Volkswagen', 'Golf 8', 600, 'DIESEL', 'AUTOMATIC'],
    ['Volkswagen', 'T-Roc', 680, 'PETROL', 'AUTOMATIC'],
    ['Volkswagen', 'Tiguan', 820, 'DIESEL', 'AUTOMATIC'],
    ['Hyundai', 'i10', 320, 'PETROL', 'MANUAL'],
    ['Hyundai', 'i20', 360, 'PETROL', 'MANUAL'],
    ['Hyundai', 'Tucson', 900, 'DIESEL', 'AUTOMATIC'],
    ['Hyundai', 'Santa Fe', 1200, 'DIESEL', 'AUTOMATIC'],
    ['Kia', 'Picanto', 300, 'PETROL', 'MANUAL'],
    ['Kia', 'Rio', 350, 'PETROL', 'MANUAL'],
    ['Kia', 'Sportage', 820, 'DIESEL', 'AUTOMATIC'],
    ['Toyota', 'Yaris', 420, 'HYBRID', 'AUTOMATIC'],
    ['Toyota', 'Corolla', 520, 'HYBRID', 'AUTOMATIC'],
    ['Toyota', 'C-HR', 720, 'HYBRID', 'AUTOMATIC'],
    ['Toyota', 'RAV4', 980, 'HYBRID', 'AUTOMATIC'],
    ['Skoda', 'Fabia', 360, 'PETROL', 'MANUAL'],
    ['Skoda', 'Octavia', 560, 'DIESEL', 'AUTOMATIC'],
    ['Skoda', 'Karoq', 720, 'DIESEL', 'AUTOMATIC'],
    ['Mercedes-Benz', 'A-Class', 950, 'PETROL', 'AUTOMATIC'],
    ['Mercedes-Benz', 'C-Class', 1250, 'DIESEL', 'AUTOMATIC'],
    ['Mercedes-Benz', 'GLC', 1500, 'DIESEL', 'AUTOMATIC'],
    ['BMW', '1 Series', 900, 'PETROL', 'AUTOMATIC'],
    ['BMW', '3 Series', 1200, 'DIESEL', 'AUTOMATIC'],
    ['BMW', 'X1', 1100, 'DIESEL', 'AUTOMATIC'],
    ['Audi', 'A3', 850, 'PETROL', 'AUTOMATIC'],
    ['Audi', 'A4', 1150, 'DIESEL', 'AUTOMATIC'],
    ['Audi', 'Q3', 1250, 'DIESEL', 'AUTOMATIC'],
    ['Ford', 'Fiesta', 340, 'PETROL', 'MANUAL'],
    ['Ford', 'Focus', 460, 'DIESEL', 'MANUAL'],
    ['Ford', 'Puma', 620, 'PETROL', 'AUTOMATIC'],
    ['Nissan', 'Micra', 330, 'PETROL', 'MANUAL'],
    ['Nissan', 'Qashqai', 700, 'DIESEL', 'AUTOMATIC'],
    ['Nissan', 'Juke', 580, 'PETROL', 'AUTOMATIC'],
    ['Seat', 'Ibiza', 350, 'PETROL', 'MANUAL'],
    ['Seat', 'Leon', 480, 'PETROL', 'AUTOMATIC'],
    ['Seat', 'Ateca', 700, 'DIESEL', 'AUTOMATIC'],
    ['Fiat', 'Tipo', 340, 'DIESEL', 'MANUAL'],
    ['Fiat', '500', 380, 'PETROL', 'MANUAL'],
    ['Fiat', 'Doblo', 540, 'DIESEL', 'MANUAL'],
    ['Range Rover', 'Velar', 1800, 'DIESEL', 'AUTOMATIC'],
  ];
  const existingDemoCars = await prisma.car.findMany({
    where: { agencyId: agency.id, licensePlate: { startsWith: 'DEMO-' } },
    select: { licensePlate: true },
  });
  const existingDemoPlates = new Set(existingDemoCars.map((car) => car.licensePlate));
  const missingDemoCars = [];
  for (let index = 0; index < 112; index++) {
    const licensePlate = `DEMO-${String(101 + index).padStart(3, '0')}-A`;
    if (existingDemoPlates.has(licensePlate)) continue;
    const [brand, model, pricePerDay, fuelType, gearbox] = demoFleetCatalog[index % demoFleetCatalog.length];
    missingDemoCars.push({
      brand,
      model,
      year: 2021 + (index % 5),
      licensePlate,
      imageUrl: demoFleetImages[index % demoFleetImages.length],
      pricePerDay,
      fuelType,
      gearbox,
      status: index % 17 === 0 ? 'MAINTENANCE' : index % 5 === 0 ? 'RENTED' : 'AVAILABLE',
      mileage: 8000 + ((index * 2371) % 72000),
      agencyId: agency.id,
    });
  }
  if (missingDemoCars.length > 0) {
    await prisma.car.createMany({ data: missingDemoCars });
  }
  console.log(`  ✓ demo fleet: ${existingDemoCars.length + missingDemoCars.length} vehicles (${missingDemoCars.length} added)`);

  // Rotate only legacy seed URLs into the larger pool. A custom URL entered by
  // an agency owner is never overwritten.
  const seededDemoCars = await prisma.car.findMany({
    where: { agencyId: agency.id, licensePlate: { startsWith: 'DEMO-' } },
    select: { id: true, licensePlate: true, imageUrl: true },
  });
  let refreshedDemoImages = 0;
  for (const car of seededDemoCars) {
    if (!legacyDemoFleetImages.includes(car.imageUrl)) continue;
    const plateNumber = Number(car.licensePlate.match(/^DEMO-(\d+)-A$/)?.[1]);
    if (!Number.isInteger(plateNumber)) continue;
    const imageUrl = demoFleetImages[(plateNumber - 101) % demoFleetImages.length];
    if (imageUrl === car.imageUrl) continue;
    await prisma.car.update({ where: { id: car.id }, data: { imageUrl } });
    refreshedDemoImages++;
  }
  console.log(`  ✓ demo imagery: ${demoFleetImages.length} unique photos (${refreshedDemoImages} legacy rows refreshed)`);

  const existingCars = await prisma.car.count({ where: { agencyId: agency.id } });
  if (existingCars === missingDemoCars.length) {
    const customers = [
      { firstName: 'Karim', lastName: 'Bennani', phone: '+212661112233', identityType: 'CIN', identityNumber: 'DEMOK1122', status: 'ACTIVE' },
      { firstName: 'Salma', lastName: 'Idrissi', phone: '+212662223344', identityType: 'CIN', identityNumber: 'DEMOS3344', email: 'salma@example.ma', status: 'ACTIVE' },
      { firstName: 'Omar', lastName: 'Fassi', phone: '+212663334455', identityType: 'PASSPORT', identityNumber: 'DEMOP5566', status: 'ACTIVE' },
    ];
    for (const cu of customers) {
      await prisma.customer.create({ data: { ...cu, agencyId: agency.id } });
    }
    console.log(`  ✓ seeded ${customers.length} customers into the demo agency`);
  }

  // Backfill imagery on an existing demo fleet without overwriting an agency's
  // own uploaded photo. The URLs are public reference photos for the demo only.
  const demoCarImages = {
    'DEMO-101-A': 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=85',
    'DEMO-102-A': 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=85',
    'DEMO-103-A': 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=85',
    'DEMO-104-A': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85',
  };
  for (const [licensePlate, imageUrl] of Object.entries(demoCarImages)) {
    await prisma.car.updateMany({
      where: { agencyId: agency.id, licensePlate, imageUrl: null },
      data: { imageUrl },
    });
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
  .finally(() => prisma.$disconnect());
