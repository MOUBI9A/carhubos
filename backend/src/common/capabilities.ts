/**
 * Capability catalog & role presets (schema foundation only).
 *
 * See docs/PRODUCT_VISION.md §2-3. This file replaces the coarse hardcoded-role
 * model with a fine-grained *capability* system:
 *   - A Capability is a single permission string (e.g. `booking.create`).
 *   - An AgencyMembership carries a SET of capabilities for one (user, agency).
 *   - A Role is a named *preset* that expands to a default capability set and is
 *     customizable by the agency owner.
 *
 * This module is the single source of truth for the catalog + presets. The
 * capability guard / decorator / controller wiring is a SEPARATE task — nothing
 * here enforces anything yet. `User.role` remains the identity-type / seed
 * preset; enforcement moves to capabilities later.
 */

/**
 * Agency capability catalog — everything a member of an agency tenant may be
 * granted. Order is intentional (grouped by domain: fleet, booking, customer,
 * finance, contracts, deposits, trust, inspection, reports, hub, admin).
 * `billing.manage` (self-serve SaaS plan upgrades) is OWNER-only — excluded
 * from MANAGER's filter below and never added to AGENT's explicit list.
 */
export const AGENCY_CAPABILITIES = [
  'fleet.view',
  'fleet.manage',
  'booking.view',
  'booking.create',
  'booking.manage',
  'booking.return',
  'customer.view',
  'customer.manage',
  'finance.view',
  'payment.record',
  'payment.verify',
  'expense.manage',
  'contract.manage',
  'contract.sign',
  'deposit.manage',
  'trust.report',
  'inspection.perform',
  'tasks.view',
  'tasks.manage',
  'reports.view',
  'hub.manage',
  'staff.manage',
  'settings.manage',
  'billing.manage',
] as const;

/**
 * Platform capability catalog — for the platform tier (ROOT_ADMIN + future
 * scoped platform staff). Not used for agency memberships.
 */
export const PLATFORM_CAPABILITIES = [
  'tenant.view',
  'tenant.manage',
  'billing.manage',
  'plan.manage',
  'impersonate',
  'platform.config',
  'support.view',
] as const;

/** Union of every valid agency capability string. */
export type AgencyCapability = (typeof AGENCY_CAPABILITIES)[number];

/** Union of every valid platform capability string. */
export type PlatformCapability = (typeof PLATFORM_CAPABILITIES)[number];

/**
 * Default capability sets for the existing identity roles. Seeds the defaults on
 * a membership; the owner may edit per staff member afterward.
 *
 *   OWNER   — the whole agency catalog.
 *   MANAGER — everything EXCEPT staff.manage + settings.manage + billing.manage
 *             (can run ops, not hire staff, change agency settings, or upgrade
 *             the SaaS plan).
 *   AGENT   — front-line operational subset (no finance.view / payment.verify /
 *             expense.manage / hub.manage / staff.manage / settings.manage).
 */
export const ROLE_PRESETS: Record<string, string[]> = {
  OWNER: [...AGENCY_CAPABILITIES],
  MANAGER: AGENCY_CAPABILITIES.filter(
    (c) =>
      c !== 'staff.manage' && c !== 'settings.manage' && c !== 'billing.manage',
  ),
  AGENT: [
    'fleet.view',
    'booking.view',
    'booking.create',
    'booking.manage',
    'booking.return',
    'customer.view',
    'customer.manage',
    'contract.manage',
    'contract.sign',
    'deposit.manage',
    'inspection.perform',
    'tasks.view',
    'tasks.manage',
    'payment.record',
    'trust.report',
    'reports.view',
  ],
};

/**
 * Named staff presets the owner UI can offer when creating staff accounts.
 * Sensible starter subsets of the agency catalog — the owner can tweak after.
 *
 *   Front desk    — bookings, customers, contracts, deposits, taking payment.
 *   Fleet manager — the fleet, inspections, booking hand-off, and B2B hub.
 *   Accountant    — the finance surface only.
 */
export const STAFF_PRESETS: Record<string, string[]> = {
  'Front desk': [
    'booking.view',
    'booking.create',
    'booking.manage',
    'booking.return',
    'customer.view',
    'customer.manage',
    'contract.manage',
    'contract.sign',
    'deposit.manage',
    'payment.record',
  ],
  'Fleet manager': [
    'fleet.view',
    'fleet.manage',
    'inspection.perform',
    'booking.view',
    'booking.manage',
    'booking.return',
    'hub.manage',
  ],
  Accountant: [
    'finance.view',
    'payment.record',
    'payment.verify',
    'expense.manage',
    'reports.view',
  ],
};
