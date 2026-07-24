-- CreateTable
CREATE TABLE "VaultFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agencyId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "VaultFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VaultFile_storagePath_key" ON "VaultFile"("storagePath");

-- CreateIndex
CREATE INDEX "VaultFile_agencyId_idx" ON "VaultFile"("agencyId");

-- CreateIndex
CREATE INDEX "VaultFile_agencyId_filename_idx" ON "VaultFile"("agencyId", "filename");

-- AddForeignKey
ALTER TABLE "VaultFile" ADD CONSTRAINT "VaultFile_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultFile" ADD CONSTRAINT "VaultFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
