-- CreateTable
CREATE TABLE "Accident" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "description" TEXT NOT NULL,
    "location" TEXT,
    "thirdParty" BOOLEAN NOT NULL DEFAULT false,
    "estimatedCost" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agencyId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "bookingId" TEXT,

    CONSTRAINT "Accident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Accident_agencyId_idx" ON "Accident"("agencyId");

-- CreateIndex
CREATE INDEX "Accident_carId_idx" ON "Accident"("carId");

-- AddForeignKey
ALTER TABLE "Accident" ADD CONSTRAINT "Accident_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accident" ADD CONSTRAINT "Accident_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accident" ADD CONSTRAINT "Accident_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

