-- AlterTable Agency: Add onboarding state and rental defaults
ALTER TABLE "Agency" ADD COLUMN "onboardingStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "onboardingCurrentStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'MAD',
ADD COLUMN "country" TEXT NOT NULL DEFAULT 'Morocco',
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Africa/Casablanca',
ADD COLUMN "defaultDeposit" DECIMAL(12,2) DEFAULT 5000;

-- AlterTable User: Add emailVerifiedAt
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable EmailVerificationToken
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_tokenHash_idx" ON "EmailVerificationToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill legacy records: existing active users who are marked verified get emailVerifiedAt; existing seeded agencies are marked COMPLETED
UPDATE "User" SET "emailVerifiedAt" = NOW() WHERE "isVerified" = true;
UPDATE "Agency" SET "onboardingStatus" = 'COMPLETED', "onboardingCompletedAt" = NOW() WHERE "onboardingStatus" = 'NOT_STARTED';
