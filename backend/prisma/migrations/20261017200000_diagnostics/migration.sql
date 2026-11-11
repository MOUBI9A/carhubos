-- Additive diagnostics; existing rental entities and data are preserved.
CREATE UNIQUE INDEX IF NOT EXISTS "Car_id_agencyId_key" ON "Car"("id", "agencyId");
CREATE TABLE IF NOT EXISTS "DiagnosticVehicle" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "fleetCarId" TEXT,
  "vin" TEXT,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "year" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiagnosticVehicle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticVehicle_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DiagnosticVehicle_fleetCarId_agencyId_fkey" FOREIGN KEY ("fleetCarId", "agencyId") REFERENCES "Car"("id", "agencyId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DiagnosticVehicle_id_agencyId_key" ON "DiagnosticVehicle"("id", "agencyId");
CREATE UNIQUE INDEX IF NOT EXISTS "DiagnosticVehicle_agencyId_fleetCarId_key" ON "DiagnosticVehicle"("agencyId", "fleetCarId");
CREATE INDEX IF NOT EXISTS "DiagnosticVehicle_agencyId_vin_idx" ON "DiagnosticVehicle"("agencyId", "vin");
CREATE TABLE IF NOT EXISTS "DiagnosticSession" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'IMPORT',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "symptoms" TEXT NOT NULL DEFAULT '',
  "data" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiagnosticSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticSession_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DiagnosticSession_vehicleId_agencyId_fkey" FOREIGN KEY ("vehicleId", "agencyId") REFERENCES "DiagnosticVehicle"("id", "agencyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DiagnosticSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DiagnosticSession_status_check" CHECK ("status" IN ('OPEN','ANALYZED','CONFIRMED','REPORTED')),
  CONSTRAINT "DiagnosticSession_source_check" CHECK ("source" IN ('SIMULATOR','IMPORT')),
  CONSTRAINT "DiagnosticSession_revision_check" CHECK ("revision" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "DiagnosticSession_id_agencyId_key" ON "DiagnosticSession"("id", "agencyId");
CREATE INDEX IF NOT EXISTS "DiagnosticSession_agencyId_createdAt_idx" ON "DiagnosticSession"("agencyId", "createdAt");

-- Owners explicitly own the new feature.
UPDATE "AgencyMembership" SET "capabilities" = ARRAY(
  SELECT DISTINCT cap FROM unnest("capabilities" || ARRAY['diagnostics.view','diagnostics.perform','diagnostics.confirm','diagnostics.estimate','work_order.manage']) cap
), "updatedAt" = CURRENT_TIMESTAMP WHERE "rolePreset" = 'OWNER';
