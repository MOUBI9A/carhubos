// ── Customers domain types (mirror backend Prisma shapes) ─────────────

export type CustomerStatus = 'ACTIVE' | 'BLACKLISTED';
export type IdentityType = 'CIN' | 'PASSPORT';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  identityType: IdentityType;
  identityNumber: string;
  nationality: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { bookings: number };
}

export interface CustomerDocument {
  id: string;
  type: string; // DRIVING_LICENSE, CIN_FRONT, CIN_BACK, PASSPORT
  fileUrl: string;
  expiryDate?: string | null;
  createdAt: string;
}

export interface CustomerBooking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  car: { id: string; brand: string; model: string; licensePlate: string };
}

export interface CustomerDetail extends Omit<Customer, '_count'> {
  bookings: CustomerBooking[];
  documents: CustomerDocument[];
  lifetimeSpend: number;
}

// ── Style maps & helpers ──────────────────────────────────────────────

export const CUSTOMER_STATUS_STYLES: Record<
  CustomerStatus,
  { chip: string; dot: string; label: string }
> = {
  ACTIVE: {
    chip: 'text-success bg-success/10 border-success/20',
    dot: 'bg-success',
    label: 'Active',
  },
  BLACKLISTED: {
    chip: 'text-danger bg-danger/10 border-danger/20',
    dot: 'bg-danger',
    label: 'Blacklisted',
  },
};

export function fullName(c: { firstName: string; lastName: string }): string {
  return `${c.firstName} ${c.lastName}`.trim();
}

export function initials(c: { firstName: string; lastName: string }): string {
  return `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase();
}

export function formatDocType(type: string): string {
  return type.replace(/_/g, ' ');
}
