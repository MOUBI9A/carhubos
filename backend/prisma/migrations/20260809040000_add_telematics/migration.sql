-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "telematicsDeviceId" TEXT;

-- CreateTable
CREATE TABLE "TelematicsIntegration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT,
    "credentials" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agencyId" TEXT NOT NULL,

    CONSTRAINT "TelematicsIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelematicsCommand" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "speedKphAtRequest" DOUBLE PRECISION,
    "ignitionOnAtRequest" BOOLEAN,
    "fixAgeSecondsAtRequest" INTEGER,
    "providerRef" TEXT,
    "failureReason" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agencyId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,

    CONSTRAINT "TelematicsCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelematicsIntegration_agencyId_key" ON "TelematicsIntegration"("agencyId");

-- CreateIndex
CREATE INDEX "TelematicsCommand_agencyId_idx" ON "TelematicsCommand"("agencyId");

-- CreateIndex
CREATE INDEX "TelematicsCommand_carId_idx" ON "TelematicsCommand"("carId");

-- CreateIndex
CREATE INDEX "TelematicsCommand_createdAt_idx" ON "TelematicsCommand"("createdAt");

-- CreateIndex
CREATE INDEX "Car_telematicsDeviceId_idx" ON "Car"("telematicsDeviceId");

-- AddForeignKey
ALTER TABLE "TelematicsIntegration" ADD CONSTRAINT "TelematicsIntegration_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelematicsCommand" ADD CONSTRAINT "TelematicsCommand_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelematicsCommand" ADD CONSTRAINT "TelematicsCommand_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
