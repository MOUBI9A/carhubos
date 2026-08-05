// ── Renter portal domain types (mirror backend portal/consent service shapes) ──
// Source of truth: backend/src/portal/portal.service.ts + backend/src/consent/consent.service.ts

export type ConsentStatus = 'PENDING' | 'APPROVED' | 'REVOKED' | 'EXPIRED';

/** GET /portal/consent item — a renter's document-access grant to an agency. */
export interface ConsentGrant {
  id: string;
  status: ConsentStatus;
  scope: string[];
  agencyId: string;
  agencyName: string | null;
  note: string | null;
  requestedAt: string;
  approvedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
}

export type RiskLevel = 'UNKNOWN' | 'TRUSTED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** The cross-tenant Trust Network summary nested in GET /portal/me. */
export type TrustSummary =
  | { linked: false; message: string }
  | { linked: true; globalScore: number; reviewCount: number; riskLevel: RiskLevel };

/** GET /portal/me response shape. */
export interface PortalMe {
  id: string;
  email: string;
  name: string;
  role: string;
  trustScore: number;
  isVerified: boolean;
  qrHash: string | null;
  createdAt: string;
  renterIdentityId: string | null;
  trustSummary: TrustSummary;
}

/** GET /portal/notifications item. */
export interface PortalNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  relatedType: string | null;
  relatedId: string | null;
  createdAt: string;
  userId: string;
}

/** GET /portal/documents item — a document in the renter's OWN global vault. */
export interface RenterDocument {
  id: string;
  type: string;
  label: string | null;
  fileUrl: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Matches backend RENTER_DOCUMENT_TYPES (portal/dto/create-renter-document.dto.ts) —
 *  the subset of SCOPE_LABELS a renter can actually upload a file for. */
export const RENTER_DOCUMENT_TYPES = [
  'CIN_FRONT',
  'CIN_BACK',
  'DRIVING_LICENSE',
  'PASSPORT',
] as const;

export type BookingStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PortalBookingCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
}

/** GET /portal/bookings item. */
export interface PortalBooking {
  id: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  totalPrice: number;
  createdAt: string;
  car: PortalBookingCar;
}

// ── Style maps ──────────────────────────────────────────────────────────────

export const CONSENT_STATUS_STYLES: Record<
  ConsentStatus,
  { chip: string; dot: string }
> = {
  PENDING: {
    chip: 'text-warning bg-warning/10 border-warning/20',
    dot: 'bg-warning animate-pulse',
  },
  APPROVED: {
    chip: 'text-success bg-success/10 border-success/20',
    dot: 'bg-success',
  },
  REVOKED: {
    chip: 'text-danger bg-danger/10 border-danger/20',
    dot: 'bg-danger',
  },
  EXPIRED: {
    chip: 'text-text-faint bg-surface border-hairline',
    dot: 'bg-text-faint/70',
  },
};

/** renterPortal message keys for each ConsentStatus — pass to t(). */
export const CONSENT_STATUS_KEYS: Record<
  ConsentStatus,
  'consentStatusPending' | 'consentStatusApproved' | 'consentStatusRevoked' | 'consentStatusExpired'
> = {
  PENDING: 'consentStatusPending',
  APPROVED: 'consentStatusApproved',
  REVOKED: 'consentStatusRevoked',
  EXPIRED: 'consentStatusExpired',
};

export const RISK_LEVEL_STYLES: Record<RiskLevel, { chip: string }> = {
  UNKNOWN: { chip: 'text-text-faint bg-surface border-hairline' },
  TRUSTED: { chip: 'text-success bg-success/10 border-success/20' },
  LOW: { chip: 'text-success/80 bg-success/5 border-success/10' },
  MEDIUM: { chip: 'text-warning bg-warning/10 border-warning/20' },
  HIGH: { chip: 'text-danger/80 bg-danger/5 border-danger/10' },
  CRITICAL: { chip: 'text-danger bg-danger/10 border-danger/20' },
};

export const RISK_LEVEL_KEYS: Record<
  RiskLevel,
  'riskNotReviewed' | 'riskTrusted' | 'riskLow' | 'riskMedium' | 'riskHigh' | 'riskCritical'
> = {
  UNKNOWN: 'riskNotReviewed',
  TRUSTED: 'riskTrusted',
  LOW: 'riskLow',
  MEDIUM: 'riskMedium',
  HIGH: 'riskHigh',
  CRITICAL: 'riskCritical',
};

export const BOOKING_STATUS_STYLES: Record<BookingStatus, { chip: string }> = {
  REQUESTED: { chip: 'text-text-muted bg-surface border-hairline' },
  APPROVED: { chip: 'text-info bg-info/10 border-info/20' },
  ACTIVE: { chip: 'text-primary bg-primary/10 border-primary/20' },
  OVERDUE: { chip: 'text-warning bg-warning/10 border-warning/20' },
  COMPLETED: { chip: 'text-success bg-success/10 border-success/20' },
  CANCELLED: { chip: 'text-danger bg-danger/10 border-danger/20' },
};

export const BOOKING_STATUS_KEYS: Record<
  BookingStatus,
  'statusRequested' | 'statusApproved' | 'statusActive' | 'statusOverdue' | 'statusCompleted' | 'statusCancelled'
> = {
  REQUESTED: 'statusRequested',
  APPROVED: 'statusApproved',
  ACTIVE: 'statusActive',
  OVERDUE: 'statusOverdue',
  COMPLETED: 'statusCompleted',
  CANCELLED: 'statusCancelled',
};

/** Matches backend CONSENT_DOC_TYPES (consent/dto/consent.dto.ts). */
export const SCOPE_LABELS: Record<string, string> = {
  CIN: 'National ID (CIN)',
  CIN_FRONT: 'National ID — Front',
  CIN_BACK: 'National ID — Back',
  DRIVING_LICENSE: 'Driving License',
  PASSPORT: 'Passport',
};

export function scopeLabel(type: string): string {
  return SCOPE_LABELS[type] ?? type;
}

// ── Formatters (locale-aware via lib/format; default FR / fr-MA) ───────────

export {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
} from '@/lib/format';

/** "3 days left" / "Expired" / "Today" — pass translated labels when available. */
export function formatRelativeToNow(
  iso: string | null | undefined,
  labels?: { expired: string; expiresToday: string; daysLeft: (days: number) => string },
): string {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return labels?.expired ?? 'Expired';
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 1) return labels?.expiresToday ?? 'Expires today';
  return labels?.daysLeft?.(days) ?? `${days} days left`;
}
