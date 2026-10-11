/**
 * Seed realistic Moroccan pilot dataset for Atlas Rent (Marrakech/Casablanca)
 * and Sahara Mobility (Agadir).
 *
 * Run with: node -r dotenv/config scripts/seed_realistic_pilot.js
 */
const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const { PrismaClient, Prisma } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const bcrypt = require(path.join(__dirname, '../backend/node_modules/bcryptjs'));
const crypto = require('crypto');
const { ROLE_PRESETS } = require(path.join(__dirname, '../backend/prisma/capability-presets'));

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

function hashCin(cin) {
  const norm = `CIN:${(cin || '').toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
  const pepper = process.env.IDENTITY_PEPPER || 'fider_secret_pepper_2026';
  return crypto.createHmac('sha256', pepper).update(norm).digest('hex');
}

async function main() {
  prisma = await getConnectedPrisma();
  console.log('🚀 Seeding realistic pilot agencies: Atlas Rent & Sahara Mobility...');
  const password = await bcrypt.hash('admin123', 10);

  // 1. Ensure Plans Exist
  const proPlan = await prisma.plan.upsert({
    where: { key: 'PRO' },
    update: {},
    create: {
      key: 'PRO',
      name: 'Pro Fleet',
      description: 'Up to 30 vehicles with full operations',
      priceMonthly: new Prisma.Decimal('999.00'),
      maxCars: 30,
      maxStaff: 8,
      features: ['ai_damage_detection', 'trust_network', 'bilingual_contracts'],
    },
  });

  const bizPlan = await prisma.plan.upsert({
    where: { key: 'BUSINESS' },
    update: {},
    create: {
      key: 'BUSINESS',
      name: 'Business Enterprise',
      description: 'Up to 100 vehicles with telematics & priority support',
      priceMonthly: new Prisma.Decimal('2499.00'),
      maxCars: 100,
      maxStaff: 25,
      features: ['ai_damage_detection', 'trust_network', 'bilingual_contracts', 'webhooks'],
    },
  });

  // 2. Provision Atlas Rent
  const atlas = await prisma.agency.upsert({
    where: { contactEmail: 'contact@atlasrent.ma' },
    update: {},
    create: {
      name: 'Atlas Rent Morocco',
      subdomain: 'atlas-rent',
      city: 'Casablanca',
      address: '24 Boulevard Zerktouni, Casablanca',
      taxId: 'ICE: 003189201000044',
      contactEmail: 'contact@atlasrent.ma',
      businessPhone: '+212522203040',
      subscriptionTier: 'PRO',
      status: 'ACTIVE',
    },
  });

  await prisma.subscription.upsert({
    where: { agencyId: atlas.id },
    update: {},
    create: {
      agencyId: atlas.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Atlas Users
  const atlasStaff = [
    { email: 'owner@atlasrent.ma', name: 'Omar Bennani', role: 'OWNER' },
    { email: 'manager@atlasrent.ma', name: 'Salma El Amrani', role: 'MANAGER' },
    { email: 'agent@atlasrent.ma', name: 'Tarik Chraibi', role: 'AGENT' },
  ];

  for (const s of atlasStaff) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { agencyId: atlas.id, role: s.role, name: s.name },
      create: {
        email: s.email,
        name: s.name,
        role: s.role,
        password,
        agencyId: atlas.id,
      },
    });

    await prisma.agencyMembership.upsert({
      where: { userId_agencyId: { userId: user.id, agencyId: atlas.id } },
      update: { rolePreset: s.role, capabilities: ROLE_PRESETS[s.role] },
      create: {
        userId: user.id,
        agencyId: atlas.id,
        rolePreset: s.role,
        capabilities: ROLE_PRESETS[s.role],
      },
    });
  }
  console.log('✓ Atlas Rent staff created');

  // Atlas Cars
  const atlasCars = [
    { brand: 'Renault', model: 'Clio 5', year: 2023, plate: '12345-A-6', price: '350.00', status: 'RENTED', mileage: 28500 },
    { brand: 'Dacia', model: 'Logan', year: 2024, plate: '67890-B-6', price: '280.00', status: 'AVAILABLE', mileage: 12400 },
    { brand: 'Hyundai', model: 'Tucson', year: 2023, plate: '11223-D-6', price: '750.00', status: 'AVAILABLE', mileage: 34100 },
    { brand: 'Peugeot', model: '208', year: 2023, plate: '44556-E-6', price: '360.00', status: 'RENTED', mileage: 19800 },
    { brand: 'Volkswagen', model: 'Golf 8', year: 2024, plate: '77889-F-6', price: '850.00', status: 'AVAILABLE', mileage: 8500 },
    { brand: 'Dacia', model: 'Sandero Stepway', year: 2023, plate: '99001-G-6', price: '320.00', status: 'MAINTENANCE', mileage: 42000 },
  ];

  const seededAtlasCars = [];
  for (const c of atlasCars) {
    const car = await prisma.car.upsert({
      where: { agencyId_licensePlate: { agencyId: atlas.id, licensePlate: c.plate } },
      update: { status: c.status, mileage: c.mileage },
      create: {
        agencyId: atlas.id,
        brand: c.brand,
        model: c.model,
        year: c.year,
        licensePlate: c.plate,
        pricePerDay: new Prisma.Decimal(c.price),
        status: c.status,
        mileage: c.mileage,
      },
    });
    seededAtlasCars.push(car);
  }

  // Atlas Customers
  const atlasCustomers = [
    { firstName: 'Karim', lastName: 'Benjelloun', email: 'karim.benjelloun@gmail.com', phone: '+212661234567', cin: 'BE123456' },
    { firstName: 'Amina', lastName: 'Tazi', email: 'amina.tazi@outlook.com', phone: '+212662987654', cin: 'BK987654' },
    { firstName: 'Youssef', lastName: 'Mansouri', email: 'youssef.m@gmail.com', phone: '+212663554433', cin: 'AA554433' },
  ];

  const seededAtlasCustomers = [];
  for (const cust of atlasCustomers) {
    const customer = await prisma.customer.upsert({
      where: {
        agencyId_identityNumber: {
          agencyId: atlas.id,
          identityNumber: cust.cin,
        },
      },
      update: {},
      create: {
        agencyId: atlas.id,
        firstName: cust.firstName,
        lastName: cust.lastName,
        email: cust.email,
        phone: cust.phone,
        identityType: 'CIN',
        identityNumber: cust.cin,
        nationality: 'MA',
      },
    });
    seededAtlasCustomers.push(customer);
  }

  // Atlas Bookings
  const now = new Date();
  const pastStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pastEnd = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const activeStart = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const activeEnd = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  // Past completed booking
  const b1 = await prisma.booking.create({
    data: {
      agencyId: atlas.id,
      carId: seededAtlasCars[0].id,
      customerId: seededAtlasCustomers[0].id,
      startDate: pastStart,
      endDate: pastEnd,
      totalPrice: new Prisma.Decimal('1750.00'),
      status: 'COMPLETED',
    },
  });

  const inv1 = await prisma.invoice.create({
    data: {
      agencyId: atlas.id,
      bookingId: b1.id,
      amount: new Prisma.Decimal('1750.00'),
      taxAmount: new Prisma.Decimal('291.67'),
      status: 'PAID',
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: inv1.id,
      amount: new Prisma.Decimal('1750.00'),
      method: 'CARD',
      status: 'VERIFIED',
    },
  });

  // Active booking
  const b2 = await prisma.booking.create({
    data: {
      agencyId: atlas.id,
      carId: seededAtlasCars[3].id,
      customerId: seededAtlasCustomers[1].id,
      startDate: activeStart,
      endDate: activeEnd,
      totalPrice: new Prisma.Decimal('1800.00'),
      status: 'ACTIVE',
    },
  });

  await prisma.invoice.create({
    data: {
      agencyId: atlas.id,
      bookingId: b2.id,
      amount: new Prisma.Decimal('1800.00'),
      taxAmount: new Prisma.Decimal('300.00'),
      status: 'PARTIAL',
    },
  });

  // 3. Provision Sahara Mobility
  const sahara = await prisma.agency.upsert({
    where: { contactEmail: 'contact@saharamobility.ma' },
    update: {},
    create: {
      name: 'Sahara Mobility Agadir',
      subdomain: 'sahara-mobility',
      city: 'Agadir',
      address: 'Avenue Hassan II, Marina Agadir',
      taxId: 'ICE: 004819200000019',
      contactEmail: 'contact@saharamobility.ma',
      businessPhone: '+212528840011',
      subscriptionTier: 'BUSINESS',
      status: 'ACTIVE',
    },
  });

  await prisma.subscription.upsert({
    where: { agencyId: sahara.id },
    update: {},
    create: {
      agencyId: sahara.id,
      planId: bizPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const saharaStaff = [
    { email: 'owner@saharamobility.ma', name: 'Mustapha Idrissi', role: 'OWNER' },
    { email: 'agent@saharamobility.ma', name: 'Khadija Amrani', role: 'AGENT' },
  ];

  for (const s of saharaStaff) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { agencyId: sahara.id, role: s.role, name: s.name },
      create: {
        email: s.email,
        name: s.name,
        role: s.role,
        password,
        agencyId: sahara.id,
      },
    });

    await prisma.agencyMembership.upsert({
      where: { userId_agencyId: { userId: user.id, agencyId: sahara.id } },
      update: { rolePreset: s.role, capabilities: ROLE_PRESETS[s.role] },
      create: {
        userId: user.id,
        agencyId: sahara.id,
        rolePreset: s.role,
        capabilities: ROLE_PRESETS[s.role],
      },
    });
  }

  const saharaCars = [
    { brand: 'Toyota', model: 'Land Cruiser Prado', year: 2023, plate: '33441-A-33', price: '1200.00', status: 'AVAILABLE', mileage: 45000 },
    { brand: 'Dacia', model: 'Duster 4x4', year: 2024, plate: '55662-B-33', price: '450.00', status: 'AVAILABLE', mileage: 14000 },
    { brand: 'Hyundai', model: 'Creta', year: 2023, plate: '77883-C-33', price: '400.00', status: 'RENTED', mileage: 22000 },
  ];

  for (const c of saharaCars) {
    await prisma.car.upsert({
      where: { agencyId_licensePlate: { agencyId: sahara.id, licensePlate: c.plate } },
      update: { status: c.status, mileage: c.mileage },
      create: {
        agencyId: sahara.id,
        brand: c.brand,
        model: c.model,
        year: c.year,
        licensePlate: c.plate,
        pricePerDay: new Prisma.Decimal(c.price),
        status: c.status,
        mileage: c.mileage,
      },
    });
  }

  console.log('✅ Realistic pilot agencies successfully provisioned:');
  console.log(`   - Atlas Rent: ${atlas.id} (Owner: owner@atlasrent.ma, Cars: ${seededAtlasCars.length})`);
  console.log(`   - Sahara Mobility: ${sahara.id} (Owner: owner@saharamobility.ma, Cars: ${saharaCars.length})`);
}

main()
  .catch((err) => {
    console.error('❌ Error seeding pilot dataset:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
