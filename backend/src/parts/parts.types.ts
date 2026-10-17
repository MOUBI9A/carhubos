export type PartTier =
  | 'OEM_DIRECT'
  | 'AFTERMARKET_PREMIUM'
  | 'AFTERMARKET_STANDARD'
  | 'ECONOMY';

export type PartAvailability =
  | 'IN_STOCK'
  | 'AVAILABLE_24H'
  | 'AVAILABLE_48H'
  | 'ORDER_ONLY';

export type CompatibilityConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PartItem {
  id: string;
  partNumber: string;
  name: string;
  category: string;
  brand: string;
  tier: PartTier;
  oemReference: string;
  crossReferences: string[];
  compatibilityConfidence: CompatibilityConfidence;
  compatibilityEvidence: string[];
  price: string; // Decimal string in MAD
  currency: string;
  availability: PartAvailability;
  supplier: string;
  warrantyMonths: number;
  applicableDtcCodes?: string[];
  applicableEngines?: string[];
}

export interface VehicleFilter {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  vin?: string;
}

export interface CrossReferenceResult {
  query: string;
  oemNumber: string;
  parts: PartItem[];
}
