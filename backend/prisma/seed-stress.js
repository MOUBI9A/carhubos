const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { ROLE_PRESETS } = require('./capability-presets');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting STRESS Seed...');

  // Optional: clear data if we want a clean state.
  // We will leave existing data and just add a massive amount.

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 1. Create a Stress Agency
  const agency = await prisma.agency.create({
    data: {
      name: 'Stress Rentals Mega Corp',
      subdomain: `stress-${Date.now()}`,
      address: 'Load Testing Data Center',
      taxId: `ICE: ${Date.now()}`,
      contactEmail: `stress${Date.now()}@rentals.ma`,
      businessPhone: '+212522000001',
      subscriptionTier: 'ENTERPRISE',
    }
  });

  const owner = await prisma.user.create({
    data: {
      email: `owner_stress_${Date.now()}@prestige.ma`,
      name: 'Stress Owner',
      password: hashedPassword,
      role: 'OWNER',
      agencyId: agency.id,
    }
  });

  await prisma.agencyMembership.create({
    data: {
      userId: owner.id,
      agencyId: agency.id,
      rolePreset: 'OWNER',
      capabilities: ROLE_PRESETS['OWNER'],
    }
  });

  console.log('Generating 10,000 Customers...');
  const customersData = [];
  for (let i = 0; i < 10000; i++) {
    customersData.push({
      firstName: `CustFirst${i}`,
      lastName: `CustLast${i}`,
      email: `cust${i}_${Date.now()}@stress.com`,
      phone: `+212600${i.toString().padStart(6, '0')}`,
      identityNumber: `STRESS${i}`,
      agencyId: agency.id,
    });
  }
  
  // Batch insert in chunks to avoid max query parameters limit in postgres
  for (let i = 0; i < customersData.length; i += 5000) {
    await prisma.customer.createMany({
      data: customersData.slice(i, i + 5000)
    });
  }

  // Get all inserted customers to reference them
  const customers = await prisma.customer.findMany({ where: { agencyId: agency.id }, select: { id: true } });
  console.log(`Created ${customers.length} Customers`);

  console.log('Generating 5,000 Cars...');
  const carsData = [];
  const brands = ['Toyota', 'Mercedes', 'BMW', 'Audi', 'Volkswagen'];
  for (let i = 0; i < 5000; i++) {
    carsData.push({
      brand: brands[i % brands.length],
      model: `Model ${i}`,
      year: 2020 + (i % 5),
      licensePlate: `STR-${i}-${Date.now()}`,
      pricePerDay: 500 + (i % 1000),
      status: i % 2 === 0 ? 'AVAILABLE' : 'RENTED',
      mileage: i * 10,
      nextServiceKm: (i + 1) * 10000,
      agencyId: agency.id,
    });
  }

  for (let i = 0; i < carsData.length; i += 2500) {
    await prisma.car.createMany({
      data: carsData.slice(i, i + 2500)
    });
  }

  const cars = await prisma.car.findMany({ where: { agencyId: agency.id }, select: { id: true, pricePerDay: true } });
  console.log(`Created ${cars.length} Cars`);

  console.log('Generating 50,000 Bookings...');
  const bookingsData = [];
  const now = new Date();
  
  for (let i = 0; i < 50000; i++) {
    const car = cars[i % cars.length];
    const customer = customers[i % customers.length];
    
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (i % 300)); // distribute over past year
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1 + (i % 10)); // 1 to 10 days
    
    const totalPrice = car.pricePerDay * (1 + (i % 10));

    bookingsData.push({
      startDate,
      endDate,
      totalPrice,
      status: i % 3 === 0 ? 'COMPLETED' : (i % 3 === 1 ? 'ACTIVE' : 'CANCELLED'),
      agencyId: agency.id,
      carId: car.id,
      customerId: customer.id,
    });
  }

  for (let i = 0; i < bookingsData.length; i += 5000) {
    await prisma.booking.createMany({
      data: bookingsData.slice(i, i + 5000)
    });
  }

  console.log(`Created ${bookingsData.length} Bookings`);
  console.log('✅ Stress Seed Completed Successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
