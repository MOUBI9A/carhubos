const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Infinity High-Fidelity Seed...');

  // 1. Clear Existing Data
  await prisma.auditLog.deleteMany();
  await prisma.refusalLog.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.carDocument.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.car.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.webhookSubscription.deleteMany();
  await prisma.agency.deleteMany();

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 2. Create Alpha Agency
  const agency = await prisma.agency.create({
    data: {
      name: 'Prestige Rentals Casablanca',
      subdomain: 'prestige-casa',
      address: 'Anfa Place, Boulevard de la Corniche, Casablanca',
      taxId: 'ICE: 002993881000055',
      contactEmail: 'operations@prestige-rentals.ma',
      businessPhone: '+212522000000',
      subscriptionTier: 'BUSINESS',
    }
  });

  // 3. Create Users
  const owner = await prisma.user.create({
    data: {
      email: 'owner@prestige.ma',
      name: 'Hamza Owner',
      password: hashedPassword,
      role: 'OWNER',
      agencyId: agency.id,
    }
  });

  const agent = await prisma.user.create({
    data: {
      email: 'agent@prestige.ma',
      name: 'Yassine Agent',
      password: hashedPassword,
      role: 'AGENT',
      agencyId: agency.id,
    }
  });

  // 4. Create Customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        firstName: 'Mehdi',
        lastName: 'Alaoui',
        email: 'mehdi@gmail.com',
        phone: '+212661001122',
        identityNumber: 'BE123456',
        agencyId: agency.id,
      }
    }),
    prisma.customer.create({
      data: {
        firstName: 'Sophia',
        lastName: 'Bennani',
        email: 'sophia@outlook.com',
        phone: '+212662003344',
        identityNumber: 'BK998877',
        agencyId: agency.id,
      }
    })
  ]);

  // 5. Create Fleet
  const cars = await Promise.all([
    prisma.car.create({
      data: {
        brand: 'Range Rover',
        model: 'Velar',
        year: 2024,
        licensePlate: '1-A-2024',
        pricePerDay: 1500,
        status: 'AVAILABLE',
        mileage: 5000,
        nextServiceKm: 15000,
        agencyId: agency.id,
      }
    }),
    prisma.car.create({
      data: {
        brand: 'Mercedes-Benz',
        model: 'G-Class',
        year: 2023,
        licensePlate: '77-B-2023',
        pricePerDay: 2500,
        status: 'RENTED',
        mileage: 12000,
        nextServiceKm: 20000,
        agencyId: agency.id,
      }
    }),
    prisma.car.create({
      data: {
        brand: 'Volkswagen',
        model: 'Touareg',
        year: 2024,
        licensePlate: '10-W-2024',
        pricePerDay: 1200,
        status: 'AVAILABLE',
        mileage: 8000,
        nextServiceKm: 18000,
        agencyId: agency.id,
      }
    })
  ]);

  // 6. Create Historical Data (Last 6 Months)
  console.log('📊 Generating historical bookings and payments...');
  const months = 6;
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const monthDate = new Date();
    monthDate.setMonth(now.getMonth() - i);
    
    // Create 3-5 bookings per month
    const bookingsCount = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < bookingsCount; j++) {
      const car = cars[Math.floor(Math.random() * cars.length)];
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const days = 2 + Math.floor(Math.random() * 5);
      
      const startDate = new Date(monthDate);
      startDate.setDate(1 + Math.floor(Math.random() * 20));
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + days);

      const totalPrice = days * car.pricePerDay;

      const booking = await prisma.booking.create({
        data: {
          startDate,
          endDate,
          totalPrice,
          status: 'COMPLETED',
          agencyId: agency.id,
          carId: car.id,
          customerId: customer.id,
        }
      });

      const invoice = await prisma.invoice.create({
        data: {
          amount: totalPrice,
          taxAmount: totalPrice * 0.2,
          status: 'PAID',
          agencyId: agency.id,
          bookingId: booking.id,
        }
      });

      await prisma.payment.create({
        data: {
          amount: totalPrice,
          status: 'VERIFIED',
          type: 'INCOME',
          method: 'BANK_TRANSFER',
          date: startDate,
          invoiceId: invoice.id,
        }
      });
    }
  }

  // 7. Create Maintenance Records
  await prisma.maintenanceRecord.create({
    data: {
      carId: cars[1].id,
      type: 'VIDANGE',
      description: 'First service and oil change',
      cost: 1200,
      mileage: 10000,
      status: 'COMPLETED',
    }
  });

  console.log('✅ High-Fidelity Seed Completed Successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
