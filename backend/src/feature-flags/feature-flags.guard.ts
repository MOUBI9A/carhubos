import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';

export const FEATURE_FLAG_KEY = 'required_feature_flag';
export const RequireFeatureFlag = (flag: string) => SetMetadata(FEATURE_FLAG_KEY, flag);

@Injectable()
export class FeatureFlagsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFlag = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFlag) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const isEnabled = this.featureFlagsService.isEnabled(requiredFlag, {
      agencyId: user?.agencyId,
      userId: user?.id,
    });

    if (!isEnabled) {
      throw new ForbiddenException(
        `Feature "${requiredFlag}" is disabled on this environment.`,
      );
    }

    return true;
  }
}
