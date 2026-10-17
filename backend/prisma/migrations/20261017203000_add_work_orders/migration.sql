-- Create WorkOrder table and indexes
CREATE TABLE IF NOT EXISTS "WorkOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "vehicleId" TEXT,
  "fleetCarId" TEXT,
  "sessionId" TEXT,
  "assignedTechnicianId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "description" TEXT NOT NULL,
  "customerNotes" TEXT,
  "internalNotes" TEXT,
  "laborHours" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "laborRate" DECIMAL(12,2) NOT NULL DEFAULT 300,
  "partsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "laborTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'MAD',
  "lineItems" JSONB NOT NULL DEFAULT '[]',
  "verificationNotes" TEXT,
  "dtcCleared" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "invoicedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkOrder_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkOrder_vehicleId_agencyId_fkey" FOREIGN KEY ("vehicleId", "agencyId") REFERENCES "DiagnosticVehicle"("id", "agencyId") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "WorkOrder_fleetCarId_agencyId_fkey" FOREIGN KEY ("fleetCarId", "agencyId") REFERENCES "Car"("id", "agencyId") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "WorkOrder_sessionId_agencyId_fkey" FOREIGN KEY ("sessionId", "agencyId") REFERENCES "DiagnosticSession"("id", "agencyId") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "WorkOrder_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "WorkOrder_status_check" CHECK ("status" IN ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'BLOCKED', 'READY_FOR_QUALITY_CHECK', 'QUALITY_CHECK', 'COMPLETED', 'INVOICED', 'CANCELLED')),
  CONSTRAINT "WorkOrder_priority_check" CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkOrder_id_agencyId_key" ON "WorkOrder"("id", "agencyId");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkOrder_agencyId_orderNumber_key" ON "WorkOrder"("agencyId", "orderNumber");
CREATE INDEX IF NOT EXISTS "WorkOrder_agencyId_status_idx" ON "WorkOrder"("agencyId", "status");
CREATE INDEX IF NOT EXISTS "WorkOrder_agencyId_assignedTechnicianId_idx" ON "WorkOrder"("agencyId", "assignedTechnicianId");
