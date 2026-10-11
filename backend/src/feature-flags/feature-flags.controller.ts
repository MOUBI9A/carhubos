import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  /**
   * Public endpoint returning active flags for frontend bootstrap.
   */
  @Get()
  getFlags() {
    return this.featureFlagsService.getAllFlags();
  }

  /**
   * Root-admin only: dynamically toggle a flag at runtime.
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ROOT_ADMIN')
  @Patch(':key')
  setOverride(
    @Param('key') key: string,
    @Body('enabled') enabled: boolean,
  ) {
    if (typeof enabled !== 'boolean') {
      throw new ForbiddenException('Property "enabled" must be boolean.');
    }
    this.featureFlagsService.setOverride(key, enabled);
    return {
      success: true,
      flag: key,
      enabled,
      timestamp: new Date().toISOString(),
    };
  }
}
