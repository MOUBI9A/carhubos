/**
 * Plain-JS mirror of the role → capability presets for the seed scripts
 * (they run standalone via `node -r dotenv/config`, so they can't import the
 * TypeScript catalog).
 *
 * ⚠️ KEEP IN SYNC with `backend/src/common/capabilities.ts` (AGENCY_CAPABILITIES
 * + ROLE_PRESETS). If the catalog changes, update this file too.
 */

// All 21 agency capabilities, same order as AGENCY_CAPABILITIES.
const ALL_AGENCY_CAPABILITIES = [
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
];

// Mirrors ROLE_PRESETS: OWNER = all 21, MANAGER = 19 (no staff/settings
// management), AGENT = the 14-cap front-line subset.
const ROLE_PRESETS = {
  OWNER: [...ALL_AGENCY_CAPABILITIES],
  MANAGER: ALL_AGENCY_CAPABILITIES.filter(
    (c) => c !== 'staff.manage' && c !== 'settings.manage',
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

module.exports = { ALL_AGENCY_CAPABILITIES, ROLE_PRESETS };
