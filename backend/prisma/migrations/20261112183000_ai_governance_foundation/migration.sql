-- AI governance Phase 1B. All settings are disabled until explicit platform
-- approval, approved provider integration and nonzero agency limits.
CREATE TABLE "AgencyAiSettings" (
  "agencyId" TEXT NOT NULL,
  "requestedEnabled" BOOLEAN NOT NULL DEFAULT false,
  "platformApproved" BOOLEAN NOT NULL DEFAULT false,
  "preferredLanguage" TEXT NOT NULL DEFAULT 'EN',
  "monthlyBudgetUsdCents" INTEGER NOT NULL DEFAULT 0,
  "monthlyRequestLimit" INTEGER NOT NULL DEFAULT 0,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgencyAiSettings_pkey" PRIMARY KEY ("agencyId"),
  CONSTRAINT "AgencyAiSettings_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgencyAiSettings_preferredLanguage_check" CHECK ("preferredLanguage" IN ('EN', 'FR', 'AR')),
  CONSTRAINT "AgencyAiSettings_monthlyBudgetUsdCents_check" CHECK ("monthlyBudgetUsdCents" BETWEEN 0 AND 100000),
  CONSTRAINT "AgencyAiSettings_monthlyRequestLimit_check" CHECK ("monthlyRequestLimit" BETWEEN 0 AND 10000),
  CONSTRAINT "AgencyAiSettings_revision_check" CHECK ("revision" >= 1)
);

CREATE TABLE "AiSettingsChange" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiSettingsChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiSettingsChange_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AiSettingsChange_agencyId_revision_key" ON "AiSettingsChange"("agencyId", "revision");
CREATE INDEX "AiSettingsChange_agencyId_createdAt_idx" ON "AiSettingsChange"("agencyId", "createdAt");

CREATE TABLE "AiUsageRecord" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "costUsdMicros" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiUsageRecord_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiUsageRecord_inputTokens_check" CHECK ("inputTokens" >= 0),
  CONSTRAINT "AiUsageRecord_outputTokens_check" CHECK ("outputTokens" >= 0),
  CONSTRAINT "AiUsageRecord_costUsdMicros_check" CHECK ("costUsdMicros" >= 0)
);
CREATE UNIQUE INDEX "AiUsageRecord_agencyId_requestKey_key" ON "AiUsageRecord"("agencyId", "requestKey");
CREATE INDEX "AiUsageRecord_agencyId_createdAt_idx" ON "AiUsageRecord"("agencyId", "createdAt");

-- Supabase Data API must not access these private, server-owned tables.
ALTER TABLE "AgencyAiSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiSettingsChange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsageRecord" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AgencyAiSettings", "AiSettingsChange", "AiUsageRecord" FROM PUBLIC;
DO $restrict_ai_governance$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "AgencyAiSettings", "AiSettingsChange", "AiUsageRecord" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "AgencyAiSettings", "AiSettingsChange", "AiUsageRecord" FROM authenticated;
  END IF;
END;
$restrict_ai_governance$;
