-- AI quota foundation is inactive by default. No agency/anon write routes.
-- All amounts are integer USD MICROunits (1 USD = 1,000,000).
CREATE TABLE "AiQuotaBucket" (
  "agencyId" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "heldRequests" INTEGER NOT NULL DEFAULT 0,
  "committedRequests" INTEGER NOT NULL DEFAULT 0,
  "heldCostUsdMicros" INTEGER NOT NULL DEFAULT 0,
  "committedCostUsdMicros" INTEGER NOT NULL DEFAULT 0,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiQuotaBucket_pkey" PRIMARY KEY ("agencyId","periodStart"),
  CONSTRAINT "AiQuotaBucket_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiQuotaBucket_heldRequests_check" CHECK ("heldRequests" >= 0),
  CONSTRAINT "AiQuotaBucket_committedRequests_check" CHECK ("committedRequests" >= 0),
  CONSTRAINT "AiQuotaBucket_heldCost_check" CHECK ("heldCostUsdMicros" >= 0),
  CONSTRAINT "AiQuotaBucket_committedCost_check" CHECK ("committedCostUsdMicros" >= 0),
  CONSTRAINT "AiQuotaBucket_lockVersion_check" CHECK ("lockVersion" >= 0)
);
CREATE TABLE "AiQuotaReservation" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "requestKey" VARCHAR(128) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "estimatedCostUsdMicros" INTEGER NOT NULL,
  "committedCostUsdMicros" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "settledAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiQuotaReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiQuotaReservation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiQuotaReservation_status_check" CHECK ("status" IN ('RESERVED','COMMITTED','RELEASED','EXPIRED')),
  CONSTRAINT "AiQuotaReservation_estimate_check" CHECK ("estimatedCostUsdMicros" BETWEEN 1 AND 1000000000),
  CONSTRAINT "AiQuotaReservation_committed_check" CHECK ("committedCostUsdMicros" BETWEEN 0 AND "estimatedCostUsdMicros"),
  CONSTRAINT "AiQuotaReservation_expiry_check" CHECK ("expiresAt" > "createdAt")
);
CREATE UNIQUE INDEX "AiQuotaReservation_agencyId_requestKey_key" ON "AiQuotaReservation" ("agencyId", "requestKey");
CREATE INDEX "AiQuotaReservation_agencyId_periodStart_status_idx" ON "AiQuotaReservation" ("agencyId", "periodStart", "status");
CREATE INDEX "AiQuotaReservation_status_expiresAt_idx" ON "AiQuotaReservation" ("status", "expiresAt");

-- Database API clients cannot directly change counters, reservations or usage.
ALTER TABLE "AiQuotaBucket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiQuotaReservation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AiQuotaBucket", "AiQuotaReservation" FROM PUBLIC;
DO $quota_roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "AiQuotaBucket", "AiQuotaReservation" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "AiQuotaBucket", "AiQuotaReservation" FROM authenticated;
  END IF;
END;
$quota_roles$;
