import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsGuard } from './feature-flags.guard';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [AuthModule, UsersModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, FeatureFlagsGuard],
  exports: [FeatureFlagsService, FeatureFlagsGuard],
})
export class FeatureFlagsModule {}
