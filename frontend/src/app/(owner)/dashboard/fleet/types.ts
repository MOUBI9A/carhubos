// ── Fleet domain types (mirror backend Prisma shapes) ─────────────────

export type CarStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
export type DocumentStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';

export interface CarDocument {
  id: string;
  type: string;
  status: DocumentStatus;
  expiryDate: string;
  issueDate?: string | null;
  fileUrl?: string | null;
  vaultFileId?: string | null;
  isMandatory: boolean;
}

export interface MaintenanceRecord {
  id: string;
  type: string;
  description: string;
  cost: number;
  mileage: number | null;
  garageName: string | null;
  invoiceUrl: string | null;
  status: 'PENDING' | 'IN_GARAGE' | 'COMPLETED';
  createdAt: string;
}

export interface CarBooking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  customer?: { firstName: string; lastName: string } | null;
}

export interface FleetCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  pricePerDay: number;
  fuelType: string;
  gearbox: string;
  status: CarStatus;
  mileage: number;
  nextServiceKm: number | null;
  currentRoi: number;
  createdAt: string;
  documents: Pick<CarDocument, 'id' | 'type' | 'status' | 'expiryDate' | 'isMandatory'>[];
  _count?: { bookings: number };
}

export interface CarDetail extends Omit<FleetCar, 'documents' | '_count'> {
  documents: CarDocument[];
  maintenance: MaintenanceRecord[];
  bookings: CarBooking[];
  hubListing?: { id: string; dailyRateB2B: number; status: string } | null;
  financials: {
    totalRevenue: number;
    totalMaintenanceCost: number;
    netProfit: number;
  };
}

// ── Derivations & style maps ──────────────────────────────────────────

/** 0–100 compliance score: VALID = 1, EXPIRING_SOON = 0.5, EXPIRED = 0. */
export function complianceScore(
  docs: Array<{ status: DocumentStatus }>,
): number {
  if (docs.length === 0) return 0;
  const total = docs.reduce((sum, d) => {
    if (d.status === 'VALID') return sum + 1;
    if (d.status === 'EXPIRING_SOON') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((total / docs.length) * 100);
}

export type Health = 'success' | 'warning' | 'danger';

export function complianceHealth(score: number): Health {
  if (score >= 90) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}

/** Whole days until an ISO date (negative = past). */
export function daysUntil(iso: string): number {
  return Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

export const CAR_STATUSES: CarStatus[] = [
  'AVAILABLE',
  'RENTED',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
];

/** Static Tailwind class maps — never build class names dynamically. */
export const STATUS_STYLES: Record<
  CarStatus,
  { text: string; bg: string; border: string; dot: string; ring: string }
> = {
  AVAILABLE: {
    text: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
    dot: 'bg-success',
    ring: 'ring-success/30',
  },
  RENTED: {
    text: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    dot: 'bg-primary',
    ring: 'ring-primary/30',
  },
  MAINTENANCE: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    dot: 'bg-warning',
    ring: 'ring-warning/30',
  },
  OUT_OF_SERVICE: {
    text: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-danger/20',
    dot: 'bg-danger',
    ring: 'ring-danger/30',
  },
};

export const HEALTH_STYLES: Record<Health, { text: string; bar: string; borderL: string }> = {
  success: { text: 'text-success', bar: 'bg-success', borderL: 'border-l-success' },
  warning: { text: 'text-warning', bar: 'bg-warning', borderL: 'border-l-warning' },
  danger: { text: 'text-danger', bar: 'bg-danger', borderL: 'border-l-danger' },
};

export const DOC_STATUS_HEALTH: Record<DocumentStatus, Health> = {
  VALID: 'success',
  EXPIRING_SOON: 'warning',
  EXPIRED: 'danger',
};

export const DOC_TYPES = [
  'INSURANCE',
  'CARTE_GRISE',
  'TECHNICAL_INSPECTION',
  'VIGNETTE',
] as const;

export const MAINTENANCE_TYPES = [
  { value: 'VIDANGE', label: 'Oil Change (Vidange)' },
  { value: 'BRAKES', label: 'Brake System' },
  { value: 'TIRES', label: 'Tire Replacement' },
  { value: 'REPAIR', label: 'Engine / Repair' },
  { value: 'GENERAL', label: 'General Service' },
] as const;

export function formatDocType(type: string): string {
  return type.replace(/_/g, ' ');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
