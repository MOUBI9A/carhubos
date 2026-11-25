-- PostgreSQL 17. Aggregate-only check of application tables, excluding Prisma's ledger.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';
SET LOCAL search_path = pg_catalog, public;
WITH tables AS (
  SELECT oid, relname, relrowsecurity
  FROM pg_class WHERE relnamespace = 'public'::regnamespace
    AND relkind IN ('r','p') AND relname <> '_prisma_migrations'
), shape AS (
  SELECT t.relname AS tbl, a.attname AS name, 'column' AS kind,
    jsonb_build_array(format_type(a.atttypid,a.atttypmod), a.attnotnull,
      pg_get_expr(d.adbin,d.adrelid), a.attidentity, a.attgenerated)::text AS definition
    FROM tables t JOIN pg_attribute a ON a.attrelid=t.oid
    LEFT JOIN pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
    WHERE a.attnum>0 AND NOT a.attisdropped
  UNION ALL SELECT t.relname,c.conname,'constraint',pg_get_constraintdef(c.oid)
    FROM tables t JOIN pg_constraint c ON c.conrelid=t.oid
  UNION ALL SELECT t.relname,i.relname,'index',pg_get_indexdef(i.oid)
    FROM tables t JOIN pg_index x ON x.indrelid=t.oid JOIN pg_class i ON i.oid=x.indexrelid
  UNION ALL SELECT t.relname,'','row-security',t.relrowsecurity::text FROM tables t
)
SELECT jsonb_build_object(
  'server',current_setting('server_version'),
  'extensions',(SELECT jsonb_object_agg(extname,extversion) FROM pg_extension),
  'application_tables',(SELECT count(*) FROM tables),
  'shape_md5',(SELECT md5(string_agg(jsonb_build_array(tbl,name,kind,definition)::text,E'\n' ORDER BY tbl COLLATE "C",kind COLLATE "C",name COLLATE "C")) FROM shape),
  'bytes_including_indexes',(SELECT sum(pg_total_relation_size(oid)) FROM tables),
  'rls_enabled',(SELECT count(*) FROM tables WHERE relrowsecurity),
  'client_role_table_grants',(SELECT count(*) FROM tables CROSS JOIN pg_roles r WHERE r.rolname IN ('anon','authenticated') AND has_table_privilege(r.oid,tables.oid,'SELECT, INSERT, UPDATE, DELETE')),
  'agency_count',(SELECT count(*) FROM "Agency"),
  'booking_count',(SELECT count(*) FROM "Booking"),
  'invalid_booking_window',(SELECT count(*) FROM "Booking" WHERE "endDate"<="startDate"),
  'booking_tenant_mismatch',(SELECT count(*) FROM "Booking" b JOIN "Car" c ON c.id=b."carId" JOIN "Customer" u ON u.id=b."customerId" WHERE b."agencyId"<>c."agencyId" OR b."agencyId"<>u."agencyId"),
  'invoice_tenant_mismatch',(SELECT count(*) FROM "Invoice" i JOIN "Booking" b ON b.id=i."bookingId" WHERE i."agencyId"<>b."agencyId"),
  'negative_booking_money',(SELECT count(*) FROM "Booking" WHERE "totalPrice"<0 OR "depositAmount"<0)
) AS audit;
COMMIT;
