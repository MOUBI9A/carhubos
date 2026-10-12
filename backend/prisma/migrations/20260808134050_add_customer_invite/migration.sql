-- CreateTable
CREATE TABLE "CustomerInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "consumedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "CustomerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvite_token_key" ON "CustomerInvite"("token");

-- CreateIndex
CREATE INDEX "CustomerInvite_agencyId_idx" ON "CustomerInvite"("agencyId");

-- CreateIndex
CREATE INDEX "CustomerInvite_customerId_idx" ON "CustomerInvite"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerInvite" ADD CONSTRAINT "CustomerInvite_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvite" ADD CONSTRAINT "CustomerInvite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
