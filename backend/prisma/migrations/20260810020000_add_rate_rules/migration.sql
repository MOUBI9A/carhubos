-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "vehicleClass" TEXT;

-- CreateTable
CREATE TABLE "RateRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "vehicleClass" TEXT,
    "carId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "minDays" INTEGER,
    "maxDays" INTEGER,
    "adjustmentType" TEXT NOT NULL,
    "adjustmentValue" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agencyId" TEXT NOT NULL,

    CONSTRAINT "RateRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateRule_agencyId_idx" ON "RateRule"("agencyId");

-- CreateIndex
CREATE INDEX "RateRule_agencyId_kind_active_idx" ON "RateRule"("agencyId", "kind", "active");

-- CreateIndex
CREATE INDEX "RateRule_carId_idx" ON "RateRule"("carId");

-- CreateIndex
CREATE INDEX "Car_vehicleClass_idx" ON "Car"("vehicleClass");

-- AddForeignKey
ALTER TABLE "RateRule" ADD CONSTRAINT "RateRule_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRule" ADD CONSTRAINT "RateRule_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
