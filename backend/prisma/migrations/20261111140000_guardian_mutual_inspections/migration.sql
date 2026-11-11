-- CreateTable
CREATE TABLE "GuardianReport" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'FULL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "agencyApprovedRevision" INTEGER,
    "customerApprovedRevision" INTEGER,
    "mileage" INTEGER NOT NULL,
    "fuelLevel" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "mutuallyApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianEvidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedByRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianFinding" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "photoId" TEXT NOT NULL,
    "videoId" TEXT,
    "videoOffsetSec" INTEGER,
    "agencyNote" TEXT,
    "repairPhotoId" TEXT,
    "repairedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianEvent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuardianReport_agencyId_carId_idx" ON "GuardianReport"("agencyId", "carId");

-- CreateIndex
CREATE INDEX "GuardianReport_agencyId_status_idx" ON "GuardianReport"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianReport_bookingId_phase_key" ON "GuardianReport"("bookingId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianEvidence_storagePath_key" ON "GuardianEvidence"("storagePath");

-- CreateIndex
CREATE INDEX "GuardianEvidence_reportId_kind_idx" ON "GuardianEvidence"("reportId", "kind");

-- CreateIndex
CREATE INDEX "GuardianFinding_reportId_status_idx" ON "GuardianFinding"("reportId", "status");

-- CreateIndex
CREATE INDEX "GuardianFinding_status_createdAt_idx" ON "GuardianFinding"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GuardianEvent_reportId_createdAt_idx" ON "GuardianEvent"("reportId", "createdAt");

-- AddForeignKey
ALTER TABLE "GuardianReport" ADD CONSTRAINT "GuardianReport_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianReport" ADD CONSTRAINT "GuardianReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianReport" ADD CONSTRAINT "GuardianReport_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianEvidence" ADD CONSTRAINT "GuardianEvidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "GuardianReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianFinding" ADD CONSTRAINT "GuardianFinding_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "GuardianReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianFinding" ADD CONSTRAINT "GuardianFinding_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "GuardianEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianFinding" ADD CONSTRAINT "GuardianFinding_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "GuardianEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianFinding" ADD CONSTRAINT "GuardianFinding_repairPhotoId_fkey" FOREIGN KEY ("repairPhotoId") REFERENCES "GuardianEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianEvent" ADD CONSTRAINT "GuardianEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "GuardianReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
