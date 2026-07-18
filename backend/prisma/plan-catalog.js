/**
 * JS mirror of src/common/plans.ts PLAN_CATALOG for the seed scripts (which run
 * as raw node and can't import TS). Keep in sync with the TS source of truth.
 * Prices are MAD, VAT-inclusive; null limit = unlimited.
 */
const PLAN_CATALOG = [
  {
    key: 'BETA',
    name: 'Beta Access',
    description:
      'Full access during the Fider beta — every feature unlocked, no limits, free.',
    priceMonthly: 0,
    maxCars: null,
    maxStaff: null,
    maxBookingsPerMonth: null,
    features: ['*'],
    isPublic: false,
    sortOrder: 0,
  },
  {
    key: 'STARTER',
    name: 'Starter',
    description: 'For a single agency getting started with digital operations.',
    priceMonthly: 299,
    maxCars: 15,
    maxStaff: 2,
    maxBookingsPerMonth: 150,
    features: ['trust_network', 'reports'],
    isPublic: true,
    sortOrder: 1,
  },
  {
    key: 'PRO',
    name: 'Pro',
    description: 'For growing agencies that need a bigger fleet and team.',
    priceMonthly: 799,
    maxCars: 50,
    maxStaff: 8,
    maxBookingsPerMonth: 1000,
    features: ['trust_network', 'reports', 'hub', 'ai_vision'],
    isPublic: true,
    sortOrder: 2,
  },
  {
    key: 'BUSINESS',
    name: 'Business',
    description:
      'For established agencies at scale — unlimited fleet, team, and bookings.',
    priceMonthly: 1999,
    maxCars: null,
    maxStaff: null,
    maxBookingsPerMonth: null,
    features: [
      'trust_network',
      'reports',
      'hub',
      'ai_vision',
      'api_access',
      'priority_support',
    ],
    isPublic: true,
    sortOrder: 3,
  },
];

const DEFAULT_PLAN_KEY = 'BETA';
const TRIAL_DAYS = 14;

module.exports = { PLAN_CATALOG, DEFAULT_PLAN_KEY, TRIAL_DAYS };
