-- Nullable to preserve existing, invitation-created and legacy users.
-- These timestamps record user actions, NOT regulatory approval.
ALTER TABLE "User"
  ADD COLUMN "legalNoticeAcknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "legalNoticeRevision" TEXT,
  ADD COLUMN "adultBusinessAuthorityConfirmedAt" TIMESTAMP(3);
