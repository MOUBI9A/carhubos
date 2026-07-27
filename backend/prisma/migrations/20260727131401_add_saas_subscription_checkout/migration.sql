-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN     "platformInvoiceId" TEXT,
ADD COLUMN     "targetPlanId" TEXT;

-- CreateIndex
CREATE INDEX "CheckoutSession_targetPlanId_idx" ON "CheckoutSession"("targetPlanId");

-- CreateIndex
CREATE INDEX "CheckoutSession_platformInvoiceId_idx" ON "CheckoutSession"("platformInvoiceId");

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_targetPlanId_fkey" FOREIGN KEY ("targetPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_platformInvoiceId_fkey" FOREIGN KEY ("platformInvoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
