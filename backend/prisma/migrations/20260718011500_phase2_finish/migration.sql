-- Phase 2 finish: Task tenant-scoping (IDOR fix), Agency soft-delete, trust-graph
-- retention on agency/booking deletion, and the two missing @updatedAt columns.
-- Hand-ordered for a POPULATED database: every new NOT NULL column is added
-- nullable (or with a temporary default), backfilled, then constrained.

-- 1) Drop the Cascade FKs from Agency/Booking INTO the trust models. Authored
--    reputation (reviews / blacklist flags / refusal logs) must be RETAINED and
--    anonymized when an agency leaves or a booking is removed, never cascade-deleted.
ALTER TABLE "BlacklistEntry" DROP CONSTRAINT "BlacklistEntry_agencyId_fkey";
ALTER TABLE "RefusalLog" DROP CONSTRAINT "RefusalLog_agencyId_fkey";
ALTER TABLE "RenterReview" DROP CONSTRAINT "RenterReview_agencyId_fkey";
ALTER TABLE "RenterReview" DROP CONSTRAINT "RenterReview_bookingId_fkey";

-- 2) Agency soft-delete tombstone (null = live).
ALTER TABLE "Agency" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- 3) Make the author/booking FK columns on the trust models nullable so ON DELETE
--    SET NULL has somewhere to land.
ALTER TABLE "BlacklistEntry" ALTER COLUMN "agencyId" DROP NOT NULL;
ALTER TABLE "RenterReview" ALTER COLUMN "bookingId" DROP NOT NULL;
ALTER TABLE "RenterReview" ALTER COLUMN "agencyId" DROP NOT NULL;
ALTER TABLE "RefusalLog" ALTER COLUMN "agencyId" DROP NOT NULL;

-- 4) Payment.updatedAt (@updatedAt). Populated table (existing rows): add with a
--    temporary default to backfill, then drop the default so the column matches
--    Prisma's app-managed @updatedAt (no DB default) and does not read as drift.
ALTER TABLE "Payment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Payment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- 5) RefusalLog.updatedAt (@updatedAt) — same pattern (safe whether or not populated).
ALTER TABLE "RefusalLog" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RefusalLog" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- 6) Task.agencyId — tenant scope. Add nullable, backfill deterministically
--    (the assignee's agency when the task is assigned to a user who has one,
--    otherwise the oldest agency), then enforce NOT NULL.
ALTER TABLE "Task" ADD COLUMN "agencyId" TEXT;

UPDATE "Task" t
SET "agencyId" = COALESCE(
  (SELECT u."agencyId" FROM "User" u WHERE u."id" = t."assigneeId"),
  (SELECT a."id" FROM "Agency" a ORDER BY a."createdAt" ASC LIMIT 1)
)
WHERE t."agencyId" IS NULL;

ALTER TABLE "Task" ALTER COLUMN "agencyId" SET NOT NULL;

-- 7) Indexes.
CREATE INDEX "Agency_deletedAt_idx" ON "Agency"("deletedAt");
CREATE INDEX "Task_agencyId_idx" ON "Task"("agencyId");

-- 8) Re-add the FKs with retention-friendly delete behavior.
ALTER TABLE "Task" ADD CONSTRAINT "Task_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefusalLog" ADD CONSTRAINT "RefusalLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RenterReview" ADD CONSTRAINT "RenterReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RenterReview" ADD CONSTRAINT "RenterReview_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BlacklistEntry" ADD CONSTRAINT "BlacklistEntry_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
