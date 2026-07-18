-- CreateTable
CREATE TABLE "RenterDocument" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "fileUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerUserId" TEXT NOT NULL,

    CONSTRAINT "RenterDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RenterDocument_ownerUserId_type_idx" ON "RenterDocument"("ownerUserId", "type");

-- AddForeignKey
ALTER TABLE "RenterDocument" ADD CONSTRAINT "RenterDocument_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

