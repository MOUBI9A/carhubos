-- Azure Flexible Server must allow btree_gist in azure.extensions before release.
-- Do not repair conflicting customer bookings automatically: stop for review.
BEGIN;
LOCK TABLE "Booking" IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Booking" WHERE "startDate" >= "endDate") THEN
    RAISE EXCEPTION 'Booking overlap migration blocked: invalid booking date order. Review existing Booking rows; no bookings were changed.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Booking" a JOIN "Booking" b
      ON a."carId" = b."carId" AND a.id < b.id
      AND a."startDate" <= b."endDate" AND a."endDate" >= b."startDate"
    WHERE a.status IN ('REQUESTED', 'APPROVED', 'ACTIVE', 'OVERDUE')
      AND b.status IN ('REQUESTED', 'APPROVED', 'ACTIVE', 'OVERDUE')
  ) THEN
    RAISE EXCEPTION 'Booking overlap migration blocked: overlapping reserving bookings exist. Review conflicting Booking rows; no bookings were changed.';
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking" ADD CONSTRAINT booking_date_order_check CHECK ("startDate" < "endDate");
-- Closed intervals preserve the application's inclusive touching-boundary rule.
ALTER TABLE "Booking" ADD CONSTRAINT booking_active_car_dates_excl
  EXCLUDE USING gist ("carId" WITH =, tsrange("startDate", "endDate", '[]') WITH &&)
  WHERE (status IN ('REQUESTED', 'APPROVED', 'ACTIVE', 'OVERDUE'));
COMMIT;
