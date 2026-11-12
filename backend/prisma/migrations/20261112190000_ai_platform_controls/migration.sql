-- Phase 1C: private platform-only AI controls. No inference enabled.
CREATE TABLE "AiPlatformPolicy" (
  "id" TEXT NOT NULL,
  "emergencyDisabled" BOOLEAN NOT NULL DEFAULT true,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiPlatformPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiPlatformPolicy_id_check" CHECK ("id" = 'GLOBAL'),
  CONSTRAINT "AiPlatformPolicy_revision_check" CHECK ("revision" >= 1)
);

-- Creating the singleton inside the migration guarantees default-deny.
INSERT INTO "AiPlatformPolicy" ("id","emergencyDisabled","revision","updatedAt")
VALUES ('GLOBAL',true,1,NOW());

CREATE TABLE "AiPlatformPolicyEvent" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "emergencyDisabled" BOOLEAN NOT NULL,
  "reason" VARCHAR(400) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiPlatformPolicyEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiPlatformPolicyEvent_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "AiPlatformPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AiPlatformPolicyEvent_revision_check" CHECK ("revision" >= 2),
  CONSTRAINT "AiPlatformPolicyEvent_reason_check" CHECK (length(trim("reason")) >= 12)
);
CREATE UNIQUE INDEX "AiPlatformPolicyEvent_policyId_revision_key"
ON "AiPlatformPolicyEvent"("policyId","revision");
CREATE INDEX "AiPlatformPolicyEvent_createdAt_idx" ON "AiPlatformPolicyEvent"("createdAt");

CREATE TABLE "AiPlatformReview" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "approved" BOOLEAN NOT NULL,
  "reason" VARCHAR(400) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiPlatformReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiPlatformReview_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiPlatformReview_revision_check" CHECK ("revision" >= 2),
  CONSTRAINT "AiPlatformReview_reason_check" CHECK (length(trim("reason")) >= 12)
);
CREATE UNIQUE INDEX "AiPlatformReview_agencyId_revision_key"
ON "AiPlatformReview"("agencyId","revision");
CREATE INDEX "AiPlatformReview_agencyId_createdAt_idx"
ON "AiPlatformReview"("agencyId","createdAt");

ALTER TABLE "AiPlatformPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiPlatformPolicyEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiPlatformReview" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AiPlatformPolicy", "AiPlatformPolicyEvent", "AiPlatformReview" FROM PUBLIC;
DO $protect_ai_platform$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
   REVOKE ALL ON "AiPlatformPolicy", "AiPlatformPolicyEvent", "AiPlatformReview" FROM anon;
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
   REVOKE ALL ON "AiPlatformPolicy", "AiPlatformPolicyEvent", "AiPlatformReview" FROM authenticated;
 END IF;
END;
$protect_ai_platform$;
