-- CreateEnum
CREATE TYPE "GuardianUploadIntentStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "GuardianUploadIntent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'VIDEO',
    "storagePath" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "expectedSizeBytes" INTEGER NOT NULL,
    "revisionAtInit" INTEGER NOT NULL,
    "phaseAtInit" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "GuardianUploadIntentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidenceId" TEXT,
    "completedRevision" INTEGER,

    CONSTRAINT "GuardianUploadIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardianUploadIntent_storagePath_key" ON "GuardianUploadIntent"("storagePath");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianUploadIntent_evidenceId_key" ON "GuardianUploadIntent"("evidenceId");

-- CreateIndex
CREATE INDEX "GuardianUploadIntent_agencyId_reportId_actorId_status_idx" ON "GuardianUploadIntent"("agencyId", "reportId", "actorId", "status");

-- CreateIndex
CREATE INDEX "GuardianUploadIntent_status_expiresAt_idx" ON "GuardianUploadIntent"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "GuardianUploadIntent" ADD CONSTRAINT "GuardianUploadIntent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "GuardianReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianUploadIntent" ADD CONSTRAINT "GuardianUploadIntent_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianUploadIntent" ADD CONSTRAINT "GuardianUploadIntent_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "GuardianEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Authorization snapshots are deliberately restricted independently of API validation.
-- Completed rows always point to the exact immutable evidence and replay revision.
ALTER TABLE "GuardianUploadIntent"
  ADD CONSTRAINT "GuardianUploadIntent_side_check" CHECK ("side" IN ('AGENCY', 'CUSTOMER')),
  ADD CONSTRAINT "GuardianUploadIntent_kind_check" CHECK ("kind" = 'VIDEO'),
  ADD CONSTRAINT "GuardianUploadIntent_mimeType_check" CHECK ("mimeType" = 'video/mp4'),
  ADD CONSTRAINT "GuardianUploadIntent_size_check" CHECK ("expectedSizeBytes" BETWEEN 6291456 AND 157286400),
  ADD CONSTRAINT "GuardianUploadIntent_revision_check" CHECK ("revisionAtInit" >= 1),
  ADD CONSTRAINT "GuardianUploadIntent_phase_check" CHECK ("phaseAtInit" IN ('OUT', 'IN')),
  ADD CONSTRAINT "GuardianUploadIntent_expiry_check" CHECK ("expiresAt" > "createdAt"),
  ADD CONSTRAINT "GuardianUploadIntent_completion_check" CHECK (
    ("status" = 'COMPLETED' AND "evidenceId" IS NOT NULL AND "completedRevision" IS NOT NULL AND "completedRevision" > "revisionAtInit")
    OR ("status" <> 'COMPLETED' AND "evidenceId" IS NULL AND "completedRevision" IS NULL)
  );

-- Client Data API roles must have neither grants nor a bypassing RLS policy.
-- NestJS performs tenant/renter authorization with its privileged server role.
ALTER TABLE public."GuardianUploadIntent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."GuardianUploadIntent" FROM PUBLIC;
DO $$
DECLARE client_role text;
BEGIN
  FOR client_role IN
    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',
      'GuardianUploadIntent', client_role
    );
  END LOOP;
END $$;
