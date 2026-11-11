export type EvidenceKind =
  "OVERVIEW" | "ODOMETER" | "FUEL" | "DAMAGE" | "VIDEO" | "REPAIR";
export type GuardianEvidence = {
  id: string;
  kind: EvidenceKind;
  mimeType: string;
  filename: string;
  sha256: string;
  createdAt: string;
  uploadedByRole: "AGENCY" | "CUSTOMER";
  uploadedById?: string;
};
export type GuardianFinding = {
  id: string;
  zone: string;
  kind: string;
  description: string;
  status: "PROPOSED" | "ACCEPTED" | "DISPUTED" | "REPAIRED";
  source: "AGENCY" | "CUSTOMER";
  agencyNote?: string | null;
  photoId: string;
  videoId?: string | null;
  videoOffsetSec?: number | null;
  repairPhotoId?: string | null;
  photo?: GuardianEvidence;
  video?: GuardianEvidence | null;
  repairPhoto?: GuardianEvidence | null;
  repairedAt?: string | null;
};
export type GuardianReport = {
  id: string;
  agencyId: string;
  carId: string;
  bookingId: string;
  phase: "OUT" | "IN";
  mode: "QUICK" | "FULL";
  mileage: number;
  fuelLevel: number;
  revision: number;
  status:
    | "DRAFT"
    | "CUSTOMER_REVIEW"
    | "CORRECTIONS_PENDING"
    | "DISPUTED"
    | "MUTUALLY_APPROVED";
  agencyApprovedRevision?: number | null;
  customerApprovedRevision?: number | null;
  findings: GuardianFinding[];
  evidence: GuardianEvidence[];
  events: {
    id: string;
    action: string;
    actorRole: string;
    createdAt: string;
    revision: number;
    details?: { note?: string; [key: string]: unknown };
  }[];
  createdAt?: string;
  publishedAt?: string | null;
  mutuallyApprovedAt?: string | null;
  car?: { brand: string; model: string; licensePlate: string };
};
export const CAR_ZONES = [
  "FRONT_BUMPER",
  "BONNET",
  "WINDSCREEN",
  "ROOF",
  "REAR_WINDOW",
  "BOOT",
  "REAR_BUMPER",
  "FRONT_LEFT_WING",
  "FRONT_LEFT_DOOR",
  "REAR_LEFT_DOOR",
  "FRONT_RIGHT_WING",
  "FRONT_RIGHT_DOOR",
  "REAR_RIGHT_DOOR",
  "FRONT_LEFT_WHEEL",
  "FRONT_RIGHT_WHEEL",
  "REAR_LEFT_WHEEL",
  "REAR_RIGHT_WHEEL",
  "INTERIOR",
  "OTHER",
];
export function niceLabel(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
export function guardianError(e: unknown): string {
  const error = e as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message =
    error?.response?.data?.message ?? error?.message ?? "Request failed";
  return Array.isArray(message) ? message.join(", ") : String(message);
}
