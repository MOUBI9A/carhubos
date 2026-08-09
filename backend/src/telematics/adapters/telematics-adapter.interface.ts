/**
 * Provider-agnostic telematics contract.
 *
 * Every GPS vendor speaks a different dialect (Traccar has numeric device ids
 * and `engineStop`; Wialon has unit ids and its own command names; a Teltonika
 * box behind Flespi is different again). Rather than leak that into the
 * domain, each vendor gets an adapter that normalizes to the two things the
 * product actually needs: "where and how is this vehicle right now" and
 * "prevent / allow it starting". Mirrors the existing payment-gateway
 * MOCK/STRIPE split.
 */

/** Normalized live state of one vehicle, as last reported by its tracker. */
export interface VehicleState {
  /** WGS84 decimal degrees. Null when the device has never had a fix. */
  latitude: number | null;
  longitude: number | null;
  /** Ground speed in km/h. */
  speedKph: number;
  /** Whether the engine/ignition is currently on, when the device reports it. */
  ignitionOn: boolean | null;
  /** When the provider last heard from the device. Drives the staleness gate. */
  lastFixAt: Date | null;
  /** Provider's own online/offline notion, when it has one. */
  online: boolean | null;
  /** Battery / external power percentage, when reported. */
  batteryPercent: number | null;
  /** Odometer in km, when reported. */
  odometerKm: number | null;
  /** Free-form extras the provider returned — surfaced read-only in the UI. */
  raw?: Record<string, unknown>;
}

/** Result of a mobility command. `providerRef` is the vendor's command id. */
export interface CommandResult {
  providerRef?: string;
}

export interface TelematicsAdapter {
  readonly provider: string;

  /**
   * Cheap round-trip proving the stored credentials still work. Called when
   * an integration is saved and by the owner's "Test connection" button, so
   * a rotated/revoked key surfaces immediately instead of at the moment
   * someone urgently needs to locate a car.
   */
  testConnection(): Promise<void>;

  /** Current normalized state for one device. */
  getVehicleState(deviceId: string): Promise<VehicleState>;

  /**
   * Engage the starter interrupt — the vehicle will not START again until
   * {@link restoreMobility}. This deliberately does NOT stop a running
   * engine; see TelematicsService for the safety interlock that enforces
   * the vehicle is already stationary before this is ever called.
   */
  immobilize(deviceId: string): Promise<CommandResult>;

  /** Release the starter interrupt so the vehicle can be started again. */
  restoreMobility(deviceId: string): Promise<CommandResult>;
}
