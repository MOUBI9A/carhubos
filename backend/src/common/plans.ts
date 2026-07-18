/**
 * SaaS plan catalog + feature vocabulary (Phase 11).
 *
 * Source of truth for the app. A JS mirror lives at `prisma/plan-catalog.js` for
 * the seed scripts (which run as raw node and can't import TS) — keep the two in
 * sync. Prices are MAD, VAT-inclusive; a null limit means unlimited.
 *
 * During the beta every agency is on the internal BETA plan (unlimited, free,
 * all features via the `*` wildcard), so gating/metering never blocks — but the
 * machinery is real and flips on the moment a paid plan is assigned.
 */

/** Feature flags a plan can unlock. `*` (only on BETA) means "all features". */
export const PLATFORM_FEATURES = [
  'trust_network', // cross-agency Trust Network / blacklist
  'hub', // B2B Hub (inter-agency listings)
  'ai_vision', // AI-vision inspections
  'reports', // Report Factory / exports
  'api_access', // webhooks + API integrations
  'priority_support', // founder priority support SLA
] as const;

export type PlatformFeature = (typeof PLATFORM_FEATURES)[number];

export interface PlanDef {
  key: string; // BETA | STARTER | PRO | BUSINESS
  name: string;
  description: string;
  priceMonthly: number; // MAD, VAT-inclusive
  maxCars: number | null; // null = unlimited
  maxStaff: number | null; // seats incl. owner; null = unlimited
  maxBookingsPerMonth: number | null; // null = unlimited
  features: string[]; // PlatformFeature[] or ['*'] for all
  isPublic: boolean; // shown on the public pricing table
  sortOrder: number;
}

export const PLAN_CATALOG: PlanDef[] = [
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

/** The plan every agency is provisioned onto during the beta. */
export const DEFAULT_PLAN_KEY = 'BETA';

/** Trial window stamped on new subscriptions (founder decision: 14 days). */
export const TRIAL_DAYS = 14;

/** Subscription lifecycle states. */
export const SUBSCRIPTION_STATUSES = [
  'TRIAL',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELED',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** States in which the tenant may keep operating the product. */
export const OPERATING_STATUSES: SubscriptionStatus[] = [
  'TRIAL',
  'ACTIVE',
  'PAST_DUE', // still operating, but dunning — a grace window before suspension
];

/** Does a plan's feature list grant `feature`? (`*` grants everything.) */
export function planHasFeature(features: string[], feature: string): boolean {
  return features.includes('*') || features.includes(feature);
}

export function getPlanDef(key: string): PlanDef | undefined {
  return PLAN_CATALOG.find((p) => p.key === key);
}
