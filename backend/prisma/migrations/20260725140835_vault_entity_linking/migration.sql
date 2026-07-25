-- AlterTable
ALTER TABLE "CarDocument" ADD COLUMN     "vaultFileId" TEXT;

-- AlterTable
ALTER TABLE "RenterDocument" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storagePath" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CarDocument_vaultFileId_key" ON "CarDocument"("vaultFileId");

-- AddForeignKey
ALTER TABLE "CarDocument" ADD CONSTRAINT "CarDocument_vaultFileId_fkey" FOREIGN KEY ("vaultFileId") REFERENCES "VaultFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

