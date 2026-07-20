// ── Agency capability catalog ───────────────────────────────────────────
// Mirrors backend/src/common/capabilities.ts (AGENCY_CAPABILITIES / ROLE_PRESETS
// / STAFF_PRESETS). Keep in sync if the backend catalog changes.

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
  'reports.view',
  'hub.manage',
  'staff.manage',
  'settings.manage',
] as const;

export type AgencyCapability = (typeof AGENCY_CAPABILITIES)[number];

/** Human labels for each capability, used by the checkbox grid. */
export const CAPABILITY_LABELS: Record<AgencyCapability, string> = {
  'fleet.view': 'View Fleet',
  'fleet.manage': 'Manage Fleet',
  'booking.view': 'View Bookings',
  'booking.create': 'Create Bookings',
  'booking.manage': 'Manage Bookings',
  'booking.return': 'Process Returns',
  'customer.view': 'View Customers',
  'customer.manage': 'Manage Customers',
  'finance.view': 'View Finance',
  'payment.record': 'Record Payments',
  'payment.verify': 'Verify Payments',
  'expense.manage': 'Manage Expenses',
  'contract.manage': 'Manage Contracts',
  'contract.sign': 'Sign Contracts',
  'deposit.manage': 'Manage Deposits',
  'trust.report': 'File Trust Reports',
  'inspection.perform': 'Perform Inspections',
  'reports.view': 'View Reports',
  'hub.manage': 'Manage B2B Hub',
  'staff.manage': 'Manage Staff',
  'settings.manage': 'Manage Settings',
};

export interface CapabilityGroup {
  title: string;
  capabilities: AgencyCapability[];
}

/** Grouped for display in the capability checkbox grid. */
export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  { title: 'Fleet', capabilities: ['fleet.view', 'fleet.manage'] },
  {
    title: 'Bookings',
    capabilities: ['booking.view', 'booking.create', 'booking.manage', 'booking.return'],
  },
  { title: 'Customers', capabilities: ['customer.view', 'customer.manage'] },
  {
    title: 'Finance',
    capabilities: ['finance.view', 'payment.record', 'payment.verify', 'expense.manage'],
  },
  {
    title: 'Contracts & Deposits',
    capabilities: ['contract.manage', 'contract.sign', 'deposit.manage'],
  },
  { title: 'Trust & Inspections', capabilities: ['trust.report', 'inspection.perform'] },
  { title: 'Reports & Hub', capabilities: ['reports.view', 'hub.manage'] },
  { title: 'Staff & Settings', capabilities: ['staff.manage', 'settings.manage'] },
];

// ── Presets ──────────────────────────────────────────────────────────────

/** Identity-role presets — mirrors backend ROLE_PRESETS. */
export const ROLE_PRESETS: Record<string, AgencyCapability[]> = {
  OWNER: [...AGENCY_CAPABILITIES],
  MANAGER: AGENCY_CAPABILITIES.filter((c) => c !== 'staff.manage' && c !== 'settings.manage'),
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
    'payment.record',
    'trust.report',
    'reports.view',
  ],
};

/** Named starter presets — mirrors backend STAFF_PRESETS. */
export const STAFF_PRESETS: Record<string, AgencyCapability[]> = {
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
  Accountant: ['finance.view', 'payment.record', 'payment.verify', 'expense.manage', 'reports.view'],
};

/** Every preset name the "Add staff" form may offer — sent verbatim as `preset`. */
export const CREATE_STAFF_PRESETS = [
  'OWNER',
  'MANAGER',
  'AGENT',
  'Front desk',
  'Fleet manager',
  'Accountant',
] as const;

/** Union lookup backing the edit-modal "quick fill from preset" buttons. */
export const ALL_PRESETS: Record<string, AgencyCapability[]> = { ...ROLE_PRESETS, ...STAFF_PRESETS };

// ── Wire types ───────────────────────────────────────────────────────────

/** Shape returned by GET /agency/staff (see backend AgencyStaffService#shape). */
export interface StaffMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  rolePreset: string;
  capabilities: string[];
}

/** Visual treatment for the role/preset chip on each staff row. */
export const ROLE_STYLES: Record<string, { chip: string; dot: string }> = {
  OWNER: { chip: 'text-primary bg-primary/10 border-primary/20', dot: 'bg-primary' },
  MANAGER: { chip: 'text-info bg-info/10 border-info/20', dot: 'bg-info' },
  AGENT: { chip: 'text-text-muted bg-surface-raised border-hairline', dot: 'bg-text-faint' },
  ROOT_ADMIN: { chip: 'text-metal bg-metal/10 border-metal/20', dot: 'bg-metal' },
};

export const DEFAULT_ROLE_STYLE = { chip: 'text-text-muted bg-surface-raised border-hairline', dot: 'bg-text-faint' };
