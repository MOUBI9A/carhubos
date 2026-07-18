-- Capability Engine (schema foundation): the AgencyMembership join model that
-- carries a per-(user, agency) capability set. Roles (User.role) stay as the
-- identity-type / preset seed; enforcement moves onto `capabilities` in a later
-- task. Catalog + presets: backend/src/common/capabilities.ts and
-- docs/PRODUCT_VISION.md §2-3.
--
-- This migration is self-contained: the DDL creates the table, and the trailing
-- data step backfills a membership for every existing agency-scoped staff user
-- (OWNER/MANAGER/AGENT with a non-null agencyId) using the ROLE_PRESETS defaults.
-- ROOT_ADMIN and RENTER intentionally get NO agency membership. The capability
-- literals below are pinned copies of ROLE_PRESETS (a migration must reproduce
-- the same result forever, so it does not import evolving app code).

-- CreateTable
CREATE TABLE "AgencyMembership" (
    "id" TEXT NOT NULL,
    "capabilities" TEXT[],
    "rolePreset" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,

    CONSTRAINT "AgencyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgencyMembership_agencyId_idx" ON "AgencyMembership"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyMembership_userId_agencyId_key" ON "AgencyMembership"("userId", "agencyId");

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one membership per existing agency-scoped staff user. Idempotent via
-- ON CONFLICT on the (userId, agencyId) unique index, so re-running is a no-op.
INSERT INTO "AgencyMembership" ("id", "userId", "agencyId", "capabilities", "rolePreset", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    u."id",
    u."agencyId",
    CASE u."role"
        WHEN 'OWNER' THEN ARRAY[
            'fleet.view','fleet.manage','booking.view','booking.create','booking.manage','booking.return',
            'customer.view','customer.manage','finance.view','payment.record','payment.verify','expense.manage',
            'contract.manage','contract.sign','deposit.manage','trust.report','inspection.perform','reports.view',
            'hub.manage','staff.manage','settings.manage'
        ]
        WHEN 'MANAGER' THEN ARRAY[
            'fleet.view','fleet.manage','booking.view','booking.create','booking.manage','booking.return',
            'customer.view','customer.manage','finance.view','payment.record','payment.verify','expense.manage',
            'contract.manage','contract.sign','deposit.manage','trust.report','inspection.perform','reports.view',
            'hub.manage'
        ]
        WHEN 'AGENT' THEN ARRAY[
            'fleet.view','booking.view','booking.create','booking.manage','booking.return','customer.view',
            'customer.manage','contract.manage','contract.sign','deposit.manage','inspection.perform',
            'payment.record','trust.report','reports.view'
        ]
    END,
    u."role",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
WHERE u."agencyId" IS NOT NULL
  AND u."role" IN ('OWNER', 'MANAGER', 'AGENT')
ON CONFLICT ("userId", "agencyId") DO NOTHING;
