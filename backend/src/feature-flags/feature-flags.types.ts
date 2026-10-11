export const FEATURE_FLAGS = {
  AI_DAMAGE_DETECTION: 'ai_damage_detection',
  CLOUD_VISION_INFERENCE: 'cloud_vision_inference',
  EXPERIMENTAL_TELEMATICS: 'experimental_telematics',
  WHATSAPP_AUTOMATIONS: 'whatsapp_automations',
  INSTANT_PAYOUTS: 'instant_payouts',
  DATA_EXPORT_PRIVACY: 'data_export_privacy',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export interface FeatureFlagContext {
  agencyId?: string;
  userId?: string;
}
