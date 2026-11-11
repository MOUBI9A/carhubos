export type Role = 'ROOT_ADMIN' | 'OWNER' | 'MANAGER' | 'AGENT' | 'RENTER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  agencyId: string | null;
  agencyName?: string;
  isVerified: boolean;
  emailVerifiedAt?: string | null;
  onboardingStatus?: string;
}

export interface Agency {
  id: string;
  name: string;
  city: string;
  address?: string;
  taxId?: string;
  contactEmail: string;
  businessPhone?: string;
  subscriptionTier: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export type CarStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'UNAVAILABLE';

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin?: string;
  currentMileage: number;
  fuelType?: string;
  transmission?: string;
  status: CarStatus;
  dailyRate: number;
  category?: string;
  color?: string;
  agencyId: string;
}

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export interface Booking {
  id: string;
  agencyId: string;
  carId: string;
  customerId?: string;
  renterId?: string;
  renterName?: string;
  renterPhone?: string;
  carMake?: string;
  carModel?: string;
  carPlate?: string;
  startDate: string;
  endDate: string;
  totalDays?: number;
  dailyRate?: number;
  totalPrice: number;
  depositAmount: number;
  status: BookingStatus;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID';
  car?: Car;
  customer?: Customer;
  createdAt?: string;
}

export interface Customer {
  id: string;
  agencyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  identityNumber?: string;
  drivingLicenseNumber?: string;
}

export interface Damage {
  id: string;
  zone: string;
  severity: 'LIGHT' | 'MODERATE' | 'SEVERE';
  description: string;
}

export interface Inspection {
  id: string;
  bookingId?: string | null;
  agencyId?: string;
  carId: string;
  type: 'PRE_RENTAL' | 'POST_RENTAL' | 'CHECK_OUT' | 'CHECK_IN';
  fuelLevel: number | string;
  odometer?: number;
  mileage?: number;
  damages?: Damage[] | any;
  photos?: string[] | any;
  signatureUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  inspectorId?: string;
}

export interface InspectionDraft {
  localId: string;
  bookingId?: string;
  carId: string;
  type: 'PRE_RENTAL' | 'POST_RENTAL' | 'CHECK_OUT' | 'CHECK_IN';
  mileage: number;
  fuelLevel: number;
  damages: Damage[] | any[];
  photos: string[]; // local file URIs or base64
  signatureUri?: string;
  signatureSvg?: string;
  notes?: string;
  createdAt: string;
  synced: boolean;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  read: boolean;
  createdAt: string;
}

export interface CommandCentreStats {
  totalCars: number;
  activeRentals: number;
  availableCars: number;
  maintenanceCars: number;
  utilizationRate: number;
  revenueMtd: number;
  pendingReturnsToday: number;
}
