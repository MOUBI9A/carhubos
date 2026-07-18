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
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 'REQUESTED' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

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
  { chip: string; dot: string; label: string }
> = {
  PENDING: {
    chip: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-500 animate-pulse',
    label: 'Awaiting Your Review',
  },
  APPROVED: {
    chip: 'text-success bg-success/10 border-success/20',
    dot: 'bg-success',
    label: 'Active',
  },
  REVOKED: {
    chip: 'text-danger bg-danger/10 border-danger/20',
    dot: 'bg-danger',
    label: 'Revoked',
  },
  EXPIRED: {
    chip: 'text-white/40 bg-white/5 border-white/10',
    dot: 'bg-white/30',
    label: 'Expired',
  },
};

export const RISK_LEVEL_STYLES: Record<
  RiskLevel,
  { chip: string; label: string }
> = {
  UNKNOWN: { chip: 'text-white/50 bg-white/5 border-white/10', label: 'Not Yet Reviewed' },
  TRUSTED: { chip: 'text-success bg-success/10 border-success/20', label: 'Trusted' },
  LOW: { chip: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Low Risk' },
  MEDIUM: { chip: 'text-amber-500 bg-amber-500/10 border-amber-500/20', label: 'Medium Risk' },
  HIGH: { chip: 'text-orange-500 bg-orange-500/10 border-orange-500/20', label: 'High Risk' },
  CRITICAL: { chip: 'text-danger bg-danger/10 border-danger/20', label: 'Critical' },
};

export const BOOKING_STATUS_STYLES: Record<BookingStatus, { chip: string; label: string }> = {
  REQUESTED: { chip: 'text-white/60 bg-white/5 border-white/10', label: 'Requested' },
  APPROVED: { chip: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Approved' },
  ACTIVE: { chip: 'text-primary bg-primary/10 border-primary/20', label: 'Active' },
  COMPLETED: { chip: 'text-success bg-success/10 border-success/20', label: 'Completed' },
  CANCELLED: { chip: 'text-danger bg-danger/10 border-danger/20', label: 'Cancelled' },
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
