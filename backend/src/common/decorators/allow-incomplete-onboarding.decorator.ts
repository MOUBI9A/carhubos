import { SetMetadata } from '@nestjs/common';

export const ALLOW_INCOMPLETE_ONBOARDING_KEY = 'allow_incomplete_onboarding';
export const AllowIncompleteOnboarding = () =>
  SetMetadata(ALLOW_INCOMPLETE_ONBOARDING_KEY, true);
