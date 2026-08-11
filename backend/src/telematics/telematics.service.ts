import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { decryptSecret, encryptSecret } from '../common/crypto';
import { TelematicsAdapter, VehicleState } from './adapters/telematics-adapter.interface';
import { MockTelematicsAdapter } from './adapters/mock-telematics.adapter';
import { TraccarAdapter } from './adapters/traccar.adapter';
import {
  SaveTelematicsIntegrationDto,
  MobilityCommandDto,
} from './dto/telematics.dto';

/**
 * How old a GPS fix may be and still be trusted to decide "this vehicle is
 * stationary".
 *
 * This is the single most important number in the file. A tracker that last
 * reported 0 km/h forty minutes ago tells you nothing about now — the car
 * could be at 120 km/h on the A3. Without this gate the speed check below is
 * security theatre: it would happily authorise immobilizing a moving vehicle
 * on the strength of a stale reading.
 */
const MAX_FIX_AGE_SECONDS = 180;

/** Above this we treat the vehicle as moving and refuse to immobilize. */
const STATIONARY_SPEED_KPH = 3; // GPS jitter at a standstill is ~1-2 km/h

@Injectable()
export class TelematicsService {
  private readonly logger = new Logger(TelematicsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // ── Integration configuration ───────────────────────────────────────

  /**
   * Owner-facing view of the connection. NOTE the explicit field list: the
   * `credentials` column must never be selected into anything that can reach
   * a controller. Selecting `*` here would leak the ciphertext (and hand an
   * attacker an offline target) the first time someone added a spread.
   */
  async getIntegration(agencyId: string) {
    const integration = await this.prisma.telematicsIntegration.findUnique({
      where: { agencyId },
      select: {
        id: true,
        provider: true,
        baseUrl: true,
        status: true,
        lastCheckedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return integration ?? null;
  }

  /**
   * Create or replace the agency's provider connection. Credentials are
   * verified against the live provider BEFORE being stored, so an owner
   * cannot save a broken integration and discover it during an incident.
   */
  async saveIntegration(
    agencyId: string,
    actorId: string,
    dto: SaveTelematicsIntegrationDto,
  ) {
    const secret = JSON.stringify({
      email: dto.username ?? '',
      password: dto.password ?? '',
    });

    const adapter = this.buildAdapter(dto.provider, dto.baseUrl ?? null, secret);
    await adapter.testConnection();

    const existing = await this.prisma.telematicsIntegration.findUnique({
      where: { agencyId },
      select: { id: true, provider: true },
    });

    const saved = await this.prisma.telematicsIntegration.upsert({
      where: { agencyId },
      create: {
        agencyId,
        provider: dto.provider,
        baseUrl: dto.baseUrl ?? null,
        credentials: encryptSecret(secret),
        status: 'ACTIVE',
        lastCheckedAt: new Date(),
        lastError: null,
      },
      update: {
        provider: dto.provider,
        baseUrl: dto.baseUrl ?? null,
        credentials: encryptSecret(secret),
        status: 'ACTIVE',
        lastCheckedAt: new Date(),
        lastError: null,
      },
      select: { id: true, provider: true, baseUrl: true, status: true },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      existing ? 'UPDATE_TELEMATICS_INTEGRATION' : 'CREATE_TELEMATICS_INTEGRATION',
      'TELEMATICS',
      saved.id,
      existing ? { provider: existing.provider } : null,
      // Provider + host only. The credentials must not reach the audit log
      // either — audit rows are widely readable by design.
      { provider: saved.provider, baseUrl: saved.baseUrl },
    );

    return saved;
  }

  async removeIntegration(agencyId: string, actorId: string) {
    const existing = await this.prisma.telematicsIntegration.findUnique({
      where: { agencyId },
      select: { id: true, provider: true },
    });
    if (!existing) {
      throw new NotFoundException('No GPS integration configured.');
    }

    await this.prisma.telematicsIntegration.delete({ where: { agencyId } });
    await this.auditLogs.log(
      agencyId,
      actorId,
      'DELETE_TELEMATICS_INTEGRATION',
      'TELEMATICS',
      existing.id,
      { provider: existing.provider },
      null,
    );
    return { deleted: true };
  }

  /** Live credential check for the owner's "Test connection" button. */
  async testIntegration(agencyId: string) {
    const adapter = await this.resolveAdapter(agencyId);
    try {
      await adapter.testConnection();
      await this.prisma.telematicsIntegration.update({
        where: { agencyId },
        data: { status: 'ACTIVE', lastCheckedAt: new Date(), lastError: null },
      });
      return { ok: true };
    } catch (err: any) {
      await this.prisma.telematicsIntegration.update({
        where: { agencyId },
        data: {
          status: 'ERROR',
          lastCheckedAt: new Date(),
          lastError: err?.message ?? 'Unknown error',
        },
      });
      throw err;
    }
  }

  // ── Device linking ──────────────────────────────────────────────────

  /** Attach (or detach, with an empty id) a provider device to one car. */
  async linkDevice(
    agencyId: string,
    carId: string,
    actorId: string,
    deviceId: string | null | undefined,
  ) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true, telematicsDeviceId: true },
    });
    if (!car) throw new NotFoundException('Car not found');

    const next = deviceId?.trim() ? deviceId.trim() : null;
    const updated = await this.prisma.car.update({
      where: { id: carId },
      data: { telematicsDeviceId: next },
      select: { id: true, telematicsDeviceId: true },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      next ? 'LINK_TELEMATICS_DEVICE' : 'UNLINK_TELEMATICS_DEVICE',
      'CAR',
      carId,
      { telematicsDeviceId: car.telematicsDeviceId },
      { telematicsDeviceId: next },
    );

    return updated;
  }

  // ── Live state ──────────────────────────────────────────────────────

  /** Current position/telemetry for one car, tenant-scoped. */
  async getCarState(agencyId: string, carId: string) {
    const { car, adapter } = await this.resolveCarAndAdapter(agencyId, carId);
    const state = await adapter.getVehicleState(car.telematicsDeviceId!);
    const latest = await this.latestCommand(carId);

    return {
      carId: car.id,
      deviceId: car.telematicsDeviceId,
      ...state,
      fixAgeSeconds: this.fixAgeSeconds(state),
      /**
       * Derived, never denormalized onto Car: a cached boolean would silently
       * drift the moment a command was sent from the provider's own console
       * instead of from here, and a wrong "mobile/immobilized" badge on a
       * safety feature is worse than none.
       */
      immobilized: latest?.type === 'IMMOBILIZE' && latest.status === 'SENT',
      lastCommand: latest,
    };
  }

  // ── Mobility commands (the dangerous part) ──────────────────────────

  /**
   * Engage the starter interrupt.
   *
   * SAFETY MODEL — deliberately narrow:
   *  - This prevents the NEXT start. It is not, and must never become, a way
   *    to cut a running engine: killing power to a moving car removes power
   *    steering and brake assist and can kill people. Industry practice for
   *    rental/fleet immobilizers is starter-interrupt precisely for this
   *    reason.
   *  - It is refused unless live telemetry proves the vehicle is stationary,
   *    ignition off, on a fix fresh enough to believe.
   *  - Every attempt, including refusals, is persisted and audit-logged.
   *
   * The interlock is enforced HERE rather than in the adapter so no future
   * provider can quietly skip it.
   */
  async immobilize(
    agencyId: string,
    carId: string,
    actorId: string,
    dto: MobilityCommandDto,
  ) {
    const { car, adapter } = await this.resolveCarAndAdapter(agencyId, carId);
    const state = await adapter.getVehicleState(car.telematicsDeviceId!);
    const fixAge = this.fixAgeSeconds(state);

    const refusal = this.blockingSafetyReason(state, fixAge);
    if (refusal) {
      await this.recordCommand({
        agencyId,
        carId,
        actorId,
        type: 'IMMOBILIZE',
        status: 'REJECTED',
        reason: dto.reason,
        state,
        fixAge,
        failureReason: refusal,
      });
      await this.auditLogs.log(
        agencyId,
        actorId,
        'TELEMATICS_IMMOBILIZE_REFUSED',
        'CAR',
        carId,
        null,
        { refusal, speedKph: state.speedKph, fixAgeSeconds: fixAge },
      );
      // 409, not 400: the request was well-formed and authorized — the
      // vehicle's current state is what makes it unsafe right now.
      throw new ConflictException(refusal);
    }

    try {
      const result = await adapter.immobilize(car.telematicsDeviceId!);
      const command = await this.recordCommand({
        agencyId,
        carId,
        actorId,
        type: 'IMMOBILIZE',
        status: 'SENT',
        reason: dto.reason,
        state,
        fixAge,
        providerRef: result.providerRef,
      });
      await this.auditLogs.log(
        agencyId,
        actorId,
        'TELEMATICS_IMMOBILIZE',
        'CAR',
        carId,
        null,
        {
          reason: dto.reason,
          speedKph: state.speedKph,
          fixAgeSeconds: fixAge,
          providerRef: result.providerRef ?? null,
        },
      );
      return command;
    } catch (err: any) {
      await this.recordCommand({
        agencyId,
        carId,
        actorId,
        type: 'IMMOBILIZE',
        status: 'FAILED',
        reason: dto.reason,
        state,
        fixAge,
        failureReason: err?.message ?? 'Provider error',
      });
      throw err;
    }
  }

  /**
   * Release the starter interrupt.
   *
   * Intentionally has NO safety interlock: restoring a customer's ability to
   * start their car is the safe direction, and gating it behind "is the fix
   * fresh?" would mean a stranded renter stays stranded exactly when the
   * tracker has poor signal — the moment they most need it undone.
   */
  async restoreMobility(
    agencyId: string,
    carId: string,
    actorId: string,
    dto: MobilityCommandDto,
  ) {
    const { car, adapter } = await this.resolveCarAndAdapter(agencyId, carId);

    let state: VehicleState | null = null;
    try {
      state = await adapter.getVehicleState(car.telematicsDeviceId!);
    } catch {
      // Best-effort snapshot only — never block a release on it.
    }

    try {
      const result = await adapter.restoreMobility(car.telematicsDeviceId!);
      const command = await this.recordCommand({
        agencyId,
        carId,
        actorId,
        type: 'RESTORE_MOBILITY',
        status: 'SENT',
        reason: dto.reason,
        state,
        fixAge: state ? this.fixAgeSeconds(state) : null,
        providerRef: result.providerRef,
      });
      await this.auditLogs.log(
        agencyId,
        actorId,
        'TELEMATICS_RESTORE_MOBILITY',
        'CAR',
        carId,
        null,
        { reason: dto.reason, providerRef: result.providerRef ?? null },
      );
      return command;
    } catch (err: any) {
      await this.recordCommand({
        agencyId,
        carId,
        actorId,
        type: 'RESTORE_MOBILITY',
        status: 'FAILED',
        reason: dto.reason,
        state,
        fixAge: state ? this.fixAgeSeconds(state) : null,
        failureReason: err?.message ?? 'Provider error',
      });
      throw err;
    }
  }

  /** Command history for one car, newest first — the dispute trail. */
  async listCommands(agencyId: string, carId: string, limit = 50) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true },
    });
    if (!car) throw new NotFoundException('Car not found');

    return this.prisma.telematicsCommand.findMany({
      where: { agencyId, carId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  // ── Internals ───────────────────────────────────────────────────────

  /**
   * Returns a human-readable refusal, or null when it is safe to proceed.
   * Order matters: report the most alarming condition first so the operator
   * sees "it's moving" rather than "the fix is old" when both are true.
   */
  private blockingSafetyReason(
    state: VehicleState,
    fixAgeSeconds: number | null,
  ): string | null {
    if (state.speedKph > STATIONARY_SPEED_KPH) {
      return `Refused: the vehicle is moving (${state.speedKph.toFixed(0)} km/h). Immobilizing is only allowed once it has stopped.`;
    }
    if (state.lastFixAt === null || fixAgeSeconds === null) {
      return 'Refused: no GPS fix has ever been received from this device, so it cannot be confirmed stationary.';
    }
    if (fixAgeSeconds > MAX_FIX_AGE_SECONDS) {
      const minutes = Math.round(fixAgeSeconds / 60);
      return `Refused: the last GPS fix is ${minutes} minute(s) old, too stale to confirm the vehicle is stopped. Wait for a fresh position.`;
    }
    if (state.ignitionOn === true) {
      return 'Refused: the ignition is still on. Immobilizing is only allowed once the engine is off.';
    }
    return null;
  }

  private fixAgeSeconds(state: VehicleState): number | null {
    if (!state.lastFixAt) return null;
    return Math.max(
      0,
      Math.round((Date.now() - state.lastFixAt.getTime()) / 1000),
    );
  }

  private async latestCommand(carId: string) {
    return this.prisma.telematicsCommand.findFirst({
      where: { carId, status: 'SENT' },
      orderBy: { createdAt: 'desc' },
    });
  }

  private recordCommand(input: {
    agencyId: string;
    carId: string;
    actorId: string;
    type: string;
    status: string;
    reason: string;
    state: VehicleState | null;
    fixAge: number | null;
    providerRef?: string;
    failureReason?: string;
  }) {
    return this.prisma.telematicsCommand.create({
      data: {
        agencyId: input.agencyId,
        carId: input.carId,
        requestedByUserId: input.actorId,
        type: input.type,
        status: input.status,
        reason: input.reason,
        speedKphAtRequest: input.state?.speedKph ?? null,
        ignitionOnAtRequest: input.state?.ignitionOn ?? null,
        fixAgeSecondsAtRequest: input.fixAge,
        providerRef: input.providerRef ?? null,
        failureReason: input.failureReason ?? null,
      },
    });
  }

  /** Car must belong to the caller's agency AND have a device linked. */
  private async resolveCarAndAdapter(agencyId: string, carId: string) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true, telematicsDeviceId: true },
    });
    if (!car) throw new NotFoundException('Car not found');
    if (!car.telematicsDeviceId) {
      throw new BadRequestException(
        'This vehicle has no GPS device linked yet.',
      );
    }
    const adapter = await this.resolveAdapter(agencyId);
    return { car, adapter };
  }

  private async resolveAdapter(agencyId: string): Promise<TelematicsAdapter> {
    const integration = await this.prisma.telematicsIntegration.findUnique({
      where: { agencyId },
    });
    if (!integration) {
      throw new ServiceUnavailableException(
        'No GPS provider is connected for this agency. Add one in Settings.',
      );
    }
    if (integration.status === 'DISABLED') {
      throw new ServiceUnavailableException(
        'The GPS integration is disabled for this agency.',
      );
    }
    return this.buildAdapter(
      integration.provider,
      integration.baseUrl,
      decryptSecret(integration.credentials),
    );
  }

  private buildAdapter(
    provider: string,
    baseUrl: string | null,
    secretJson: string,
  ): TelematicsAdapter {
    switch (provider) {
      case 'MOCK':
        return new MockTelematicsAdapter();
      case 'TRACCAR': {
        if (!baseUrl) {
          throw new BadRequestException('Traccar requires a server URL.');
        }
        const creds = JSON.parse(secretJson) as {
          email: string;
          password: string;
        };
        return new TraccarAdapter(baseUrl, creds);
      }
      default:
        throw new BadRequestException(
          `Unsupported GPS provider "${provider}".`,
        );
    }
  }
}
