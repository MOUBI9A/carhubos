// ── Bookings domain types (mirror backend Prisma shapes) ──────────────

export type BookingStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BookingCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
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
  COMPLETED: [],
  CANCELLED: [],
};

export const BOOKING_STATUSES: BookingStatus[] = [
  'REQUESTED',
  'APPROVED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
];

/** Static style maps — chip = badges, block = scheduler bars. */
export const BOOKING_STATUS_STYLES: Record<
  BookingStatus,
  { chip: string; block: string; dot: string; label: string }
> = {
  REQUESTED: {
    chip: 'text-white/60 bg-white/5 border-white/10',
    block: 'bg-white/10 border-white/20 text-white/70',
    dot: 'bg-white/40',
    label: 'Requested',
  },
  APPROVED: {
    chip: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    block: 'bg-blue-500/80 border-blue-400/50 text-white',
    dot: 'bg-blue-500',
    label: 'Approved',
  },
  ACTIVE: {
    chip: 'text-primary bg-primary/10 border-primary/20',
    block: 'bg-primary/90 border-primary/50 text-white',
    dot: 'bg-primary',
    label: 'Active',
  },
  COMPLETED: {
    chip: 'text-success bg-success/10 border-success/20',
    block: 'bg-white/5 border-white/10 text-white/40',
    dot: 'bg-success',
    label: 'Completed',
  },
  CANCELLED: {
    chip: 'text-danger bg-danger/10 border-danger/20',
    block: 'bg-danger/20 border-danger/20 text-white/40 line-through',
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
