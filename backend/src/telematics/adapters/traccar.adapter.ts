import {
  BadGatewayException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CommandResult,
  TelematicsAdapter,
  VehicleState,
} from './telematics-adapter.interface';

/**
 * Traccar adapter — https://www.traccar.org/api-reference/
 *
 * Traccar is the pragmatic default for this market: it's open-source,
 * self-hostable, and speaks 200+ device protocols, which is what the generic
 * GT06/Concox/Teltonika boxes most Moroccan installers fit actually talk. An
 * agency points us at their own Traccar server and supplies their own login,
 * so Fider never sits in the middle of the device connection.
 *
 * Endpoints used:
 *   GET  /api/devices             — session check + device lookup
 *   GET  /api/positions?deviceId= — latest position for one device
 *   POST /api/commands/send       — { deviceId, type: engineStop|engineResume }
 *
 * Auth is HTTP Basic. Note `engineStop`/`engineResume` are Traccar's names
 * for the digital-output starter interrupt; whether a given device honours
 * them depends on the device protocol and on the relay actually being wired,
 * which is why every command result is recorded rather than assumed.
 */

const REQUEST_TIMEOUT_MS = 10_000;

export interface TraccarCredentials {
  email: string;
  password: string;
}

interface TraccarPosition {
  deviceId: number;
  latitude: number;
  longitude: number;
  speed: number; // KNOTS — Traccar reports speed in knots, not km/h
  deviceTime?: string;
  fixTime?: string;
  serverTime?: string;
  attributes?: Record<string, unknown>;
}

/** Traccar reports speed in knots; the product speaks km/h everywhere. */
const KNOTS_TO_KPH = 1.852;

export class TraccarAdapter implements TelematicsAdapter {
  readonly provider = 'TRACCAR';
  private readonly logger = new Logger(TraccarAdapter.name);

  constructor(
    private readonly baseUrl: string,
    private readonly credentials: TraccarCredentials,
  ) {}

  private authHeader(): string {
    const token = Buffer.from(
      `${this.credentials.email}:${this.credentials.password}`,
    ).toString('base64');
    return `Basic ${token}`;
  }

  /**
   * One place for every outbound call so timeout, auth, and error mapping
   * are impossible to forget. Provider errors are deliberately NOT passed
   * through verbatim to the client — a vendor response can echo back the
   * credentials or internal hostnames.
   */
  private async request<T>(
    path: string,
    init: { method: string; body?: unknown } = { method: 'GET' },
  ): Promise<T> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method: init.method,
        headers: {
          Authorization: this.authHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
        // Never chase a redirect: it could bounce us off the screened host
        // onto an internal address and defeat the SSRF check done at save time.
        redirect: 'manual',
      });
    } catch (err: any) {
      this.logger.error(
        `Traccar request failed (${init.method} ${path}): ${err?.message}`,
      );
      throw new ServiceUnavailableException(
        'Could not reach the GPS provider. Check the server URL and that it is online.',
      );
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 403) {
      throw new UnauthorizedException(
        'The GPS provider rejected the stored credentials. Re-enter them in Settings.',
      );
    }
    if (res.status >= 300 && res.status < 400) {
      throw new BadGatewayException(
        'The GPS provider redirected the request, which is not followed for security reasons. Use the final server URL.',
      );
    }
    if (!res.ok) {
      this.logger.error(`Traccar ${init.method} ${path} -> ${res.status}`);
      throw new BadGatewayException(
        `The GPS provider returned an error (${res.status}).`,
      );
    }

    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BadGatewayException(
        'The GPS provider returned a response that was not valid JSON.',
      );
    }
  }

  async testConnection(): Promise<void> {
    await this.request('/api/devices', { method: 'GET' });
  }

  async getVehicleState(deviceId: string): Promise<VehicleState> {
    const positions = await this.request<TraccarPosition[]>(
      `/api/positions?deviceId=${encodeURIComponent(deviceId)}`,
    );

    const position = Array.isArray(positions) ? positions[0] : undefined;
    if (!position) {
      // Device exists but has never reported (or the id is wrong). Report an
      // unknown state rather than throwing: the caller's staleness gate will
      // refuse any command on a null fix, which is the safe outcome.
      return {
        latitude: null,
        longitude: null,
        speedKph: 0,
        ignitionOn: null,
        lastFixAt: null,
        online: false,
        batteryPercent: null,
        odometerKm: null,
      };
    }

    const attrs = position.attributes ?? {};
    const fixTime =
      position.fixTime ?? position.deviceTime ?? position.serverTime ?? null;

    return {
      latitude: position.latitude ?? null,
      longitude: position.longitude ?? null,
      speedKph: Math.max(0, (position.speed ?? 0) * KNOTS_TO_KPH),
      ignitionOn: typeof attrs.ignition === 'boolean' ? attrs.ignition : null,
      lastFixAt: fixTime ? new Date(fixTime) : null,
      online: true,
      batteryPercent:
        typeof attrs.batteryLevel === 'number' ? attrs.batteryLevel : null,
      // Traccar reports odometer in metres.
      odometerKm:
        typeof attrs.odometer === 'number'
          ? Math.round(attrs.odometer / 1000)
          : null,
      raw: attrs,
    };
  }

  private async sendCommand(
    deviceId: string,
    type: 'engineStop' | 'engineResume',
  ): Promise<CommandResult> {
    const created = await this.request<{ id?: number }>('/api/commands/send', {
      method: 'POST',
      body: { deviceId: Number(deviceId), type, attributes: {} },
    });
    return { providerRef: created?.id ? String(created.id) : undefined };
  }

  immobilize(deviceId: string): Promise<CommandResult> {
    return this.sendCommand(deviceId, 'engineStop');
  }

  restoreMobility(deviceId: string): Promise<CommandResult> {
    return this.sendCommand(deviceId, 'engineResume');
  }
}
