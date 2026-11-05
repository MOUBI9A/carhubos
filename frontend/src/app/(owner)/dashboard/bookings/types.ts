// ── Bookings domain types (mirror backend Prisma shapes) ──────────────

export type BookingStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BookingCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  imageUrl?: string | null;
  pricePerDay: number;
  status: string;
}

export interface BookingCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  depositAmount: number;
  depositStatus: 'PENDING' | 'HELD' | 'RETURNED' | 'CLAIMED';
  depositMethod: string;
  status: BookingStatus;
  contractUrl?: string | null;
  createdAt: string;
  carId: string;
  customerId: string;
  car: BookingCar;
  customer: BookingCustomer;
}

// ── Lifecycle ─────────────────────────────────────────────────────────

export interface StatusAction {
  to: BookingStatus;
  label: string;
  variant: 'primary' | 'outline' | 'danger';
}

/** Mirrors the backend transition graph — keep in sync with bookings.service. */
export const BOOKING_TRANSITIONS: Record<BookingStatus, StatusAction[]> = {
  REQUESTED: [
    { to: 'APPROVED', label: 'Approve Request', variant: 'primary' },
    { to: 'CANCELLED', label: 'Cancel', variant: 'danger' },
  ],
  APPROVED: [
    { to: 'ACTIVE', label: 'Start Rental', variant: 'primary' },
    { to: 'CANCELLED', label: 'Cancel', variant: 'danger' },
  ],
  ACTIVE: [{ to: 'COMPLETED', label: 'Complete Return', variant: 'primary' }],
  // OVERDUE is reached automatically (the hourly cron flips ACTIVE → OVERDUE past
  // the return date), not by a manual button; closing it out charges the late fee.
  OVERDUE: [
    { to: 'COMPLETED', label: 'Complete Return', variant: 'primary' },
    { to: 'CANCELLED', label: 'Cancel', variant: 'danger' },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export const BOOKING_STATUSES: BookingStatus[] = [
  'REQUESTED',
  'APPROVED',
  'ACTIVE',
  'OVERDUE',
  'COMPLETED',
  'CANCELLED',
];

/** Static style maps — chip = badges, block = scheduler bars. */
export const BOOKING_STATUS_STYLES: Record<
  BookingStatus,
  { chip: string; block: string; dot: string; label: string }
> = {
  REQUESTED: {
    chip: 'text-text-muted bg-surface border-hairline',
    block: 'bg-surface-raised border-hairline text-text-muted',
    dot: 'bg-text-faint',
    label: 'Requested',
  },
  APPROVED: {
    chip: 'text-info bg-info/10 border-info/20',
    block: 'bg-info/80 border-info/50 text-cream',
    dot: 'bg-info',
    label: 'Approved',
  },
  ACTIVE: {
    chip: 'text-primary bg-primary/10 border-primary/20',
    block: 'bg-primary/90 border-primary/50 text-cream',
    dot: 'bg-primary',
    label: 'Active',
  },
  OVERDUE: {
    chip: 'text-warning bg-warning/10 border-warning/20',
    block: 'bg-warning/90 border-warning/50 text-cream',
    dot: 'bg-warning',
    label: 'Overdue',
  },
  COMPLETED: {
    chip: 'text-success bg-success/10 border-success/20',
    block: 'bg-surface border-hairline text-text-faint',
    dot: 'bg-success',
    label: 'Completed',
  },
  CANCELLED: {
    chip: 'text-danger bg-danger/10 border-danger/20',
    block: 'bg-danger/20 border-danger/20 text-text-faint line-through',
    dot: 'bg-danger',
    label: 'Cancelled',
  },
};

// ── Date helpers ──────────────────────────────────────────────────────

export const MS_PER_DAY = 86_400_000;

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Billable days, matching backend pricing (ceil of the date diff, min 1). */
export function billableDays(startIso: string, endIso: string): number {
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(1, Math.ceil(diff / MS_PER_DAY));
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
