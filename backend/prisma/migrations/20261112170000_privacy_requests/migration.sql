-- Minimal, private queue. No raw personal data or free-text reason is copied.
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PrivacyRequest_type_check" CHECK ("type" IN ('ACCESS','RECTIFICATION','ERASURE','OPPOSITION')),
    CONSTRAINT "PrivacyRequest_status_check" CHECK ("status" IN ('PENDING','IN_REVIEW','CLOSED')),
    CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PrivacyRequest_userId_createdAt_idx" ON "PrivacyRequest" ("userId","createdAt");
CREATE INDEX "PrivacyRequest_status_createdAt_idx" ON "PrivacyRequest" ("status","createdAt");
-- Idempotence is enforced in PostgreSQL even under concurrent requests.
CREATE UNIQUE INDEX "PrivacyRequest_one_open_per_type" ON "PrivacyRequest" ("userId","type") WHERE "status" IN ('PENDING', 'IN_REVIEW');

-- Prevent public or anon Data API access even if the table is exposed by PostgREST.
ALTER TABLE "PrivacyRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PrivacyRequest" FROM PUBLIC;
-- PostgreSQL CI/local installations may not have Supabase's API roles.
DO $revoke_privacy_roles$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON TABLE "PrivacyRequest" FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON TABLE "PrivacyRequest" FROM authenticated';
    END IF;
END;
$revoke_privacy_roles$;
