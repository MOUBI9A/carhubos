-- The NestJS API uses Prisma with a privileged PostgreSQL role and enforces
-- agency and renter authorization. These tables must never be directly
-- accessible from the Supabase anon/authenticated Data API.
-- Keep private records behind the application API, not client-side PostgREST.
DO $$
DECLARE
  feature_table text;
  client_role text;
BEGIN
  FOREACH feature_table IN ARRAY ARRAY[
    'EmailVerificationToken',
    'DiagnosticVehicle',
    'DiagnosticSession',
    'WorkOrder',
    'GuardianReport',
    'GuardianEvidence',
    'GuardianFinding',
    'GuardianEvent'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', feature_table);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', feature_table);
    FOR client_role IN
      SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
    LOOP
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',
        feature_table, client_role
      );
    END LOOP;
  END LOOP;
END $$;
