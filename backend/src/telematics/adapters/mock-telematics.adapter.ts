import { Logger } from '@nestjs/common';
import {
  CommandResult,
  TelematicsAdapter,
  VehicleState,
} from './telematics-adapter.interface';

/**
 * Demo/dev adapter — no network, no hardware, no vendor account.
 *
 * Deterministic per deviceId (hash-derived) so the same car always shows the
 * same plausible position around Casablanca instead of jumping every reload,
 * which makes the UI demoable and the E2E specs stable. Reports a stationary,
 * ignition-off, freshly-fixed vehicle so the safety interlock's happy path is
 * exercisable without pretending to be a real tracker.
 */
export class MockTelematicsAdapter implements TelematicsAdapter {
  readonly provider = 'MOCK';
  private readonly logger = new Logger(MockTelematicsAdapter.name);

  /** Devices currently starter-interrupted, in memory only. */
  private static immobilized = new Set<string>();

  private hash(deviceId: string): number {
    let h = 0;
    for (let i = 0; i < deviceId.length; i++) {
      h = (h * 31 + deviceId.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  async testConnection(): Promise<void> {
    // Always reachable — there is nothing to reach.
  }

  async getVehicleState(deviceId: string): Promise<VehicleState> {
    const h = this.hash(deviceId);
    // Scatter within roughly greater Casablanca.
    const latitude = 33.5731 + ((h % 1000) / 1000 - 0.5) * 0.12;
    const longitude = -7.5898 + (((h >> 10) % 1000) / 1000 - 0.5) * 0.12;

    return {
      latitude,
      longitude,
      speedKph: 0,
      ignitionOn: false,
      lastFixAt: new Date(),
      online: true,
      batteryPercent: 60 + (h % 40),
      odometerKm: 10_000 + (h % 90_000),
      raw: {
        simulated: true,
        immobilized: MockTelematicsAdapter.immobilized.has(deviceId),
      },
    };
  }

  async immobilize(deviceId: string): Promise<CommandResult> {
    MockTelematicsAdapter.immobilized.add(deviceId);
    this.logger.log(`MOCK immobilize (starter interrupt) for ${deviceId}`);
    return { providerRef: `mock-cmd-${Date.now()}` };
  }

  async restoreMobility(deviceId: string): Promise<CommandResult> {
    MockTelematicsAdapter.immobilized.delete(deviceId);
    this.logger.log(`MOCK restore mobility for ${deviceId}`);
    return { providerRef: `mock-cmd-${Date.now()}` };
  }
}
