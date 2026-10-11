import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FEATURE_FLAGS, FeatureFlagKey, FeatureFlagContext } from './feature-flags.types';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly runtimeOverrides = new Map<string, boolean>();

  // Default baseline configuration for pilot environment
  private readonly defaultFlags: Record<string, boolean> = {
    [FEATURE_FLAGS.AI_DAMAGE_DETECTION]: true,
    [FEATURE_FLAGS.CLOUD_VISION_INFERENCE]: false, // Disabled until live cloud CV credentials configured
    [FEATURE_FLAGS.EXPERIMENTAL_TELEMATICS]: false,
    [FEATURE_FLAGS.WHATSAPP_AUTOMATIONS]: true,
    [FEATURE_FLAGS.INSTANT_PAYOUTS]: false,
    [FEATURE_FLAGS.DATA_EXPORT_PRIVACY]: true,
  };

  constructor(private readonly config: ConfigService) {}

  /**
   * Evaluates if a given feature flag is active.
   */
  isEnabled(flag: string, context?: FeatureFlagContext): boolean {
    // 1. Runtime override takes highest precedence (e.g. root-admin toggle)
    if (this.runtimeOverrides.has(flag)) {
      return this.runtimeOverrides.get(flag)!;
    }

    // 2. Environment variable check: FF_<FLAG_NAME_UPPERCASE>
    const envKey = `FF_${flag.toUpperCase()}`;
    const envVal = this.config.get<string>(envKey);
    if (envVal !== undefined) {
      return envVal === 'true' || envVal === '1';
    }

    // 3. Fallback to default flag baseline
    return this.defaultFlags[flag] ?? false;
  }

  /**
   * Returns a dictionary of all active flags for client bootstrap.
   */
  getAllFlags(context?: FeatureFlagContext): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const key of Object.values(FEATURE_FLAGS)) {
      result[key] = this.isEnabled(key, context);
    }
    return result;
  }

  /**
   * Sets a dynamic runtime override (accessible only by ROOT_ADMIN).
   */
  setOverride(flag: string, enabled: boolean): void {
    this.logger.log(`Setting runtime feature flag override: ${flag} = ${enabled}`);
    this.runtimeOverrides.set(flag, enabled);
  }

  /**
   * Clears a dynamic override.
   */
  clearOverride(flag: string): void {
    this.runtimeOverrides.delete(flag);
  }
}
