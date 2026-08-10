-- Backfill the two new telematics capabilities onto EXISTING memberships.
--
-- Adding a string to the capability catalog in code only affects memberships
-- created afterwards: an AgencyMembership stores its granted capabilities as
-- a materialised String[] snapshot, so without this every agency that already
-- existed would find the GPS feature permanently 403-ing with no way to
-- self-serve a fix (the Staff & Access UI can only toggle capabilities the
-- membership already knows about). Found live: a seeded OWNER got
-- "Missing required capability: telematics.view" immediately after the
-- feature shipped.
--
-- Grants mirror ROLE_PRESETS in src/common/capabilities.ts exactly:
--   OWNER   -> telematics.view + telematics.command
--   MANAGER -> telematics.view only (locating a car is ops; immobilizing a
--              customer's vehicle is an owner decision)
--   AGENT   -> telematics.view only
-- Any other rolePreset (custom staff presets like 'Front desk') is left
-- untouched — those are hand-curated by the owner, and silently widening
-- them would be exactly the kind of surprise privilege grant this codebase's
-- fail-closed capability model exists to prevent.
--
-- array_append is guarded by NOT (... = ANY(capabilities)) so re-running is a
-- no-op and no membership can end up with a duplicate entry.

-- OWNER: view
UPDATE "AgencyMembership"
SET "capabilities" = array_append("capabilities", 'telematics.view')
WHERE "rolePreset" = 'OWNER'
  AND NOT ('telematics.view' = ANY("capabilities"));

-- OWNER: command
UPDATE "AgencyMembership"
SET "capabilities" = array_append("capabilities", 'telematics.command')
WHERE "rolePreset" = 'OWNER'
  AND NOT ('telematics.command' = ANY("capabilities"));

-- MANAGER + AGENT: view only, never command
UPDATE "AgencyMembership"
SET "capabilities" = array_append("capabilities", 'telematics.view')
WHERE "rolePreset" IN ('MANAGER', 'AGENT')
  AND NOT ('telematics.view' = ANY("capabilities"));
