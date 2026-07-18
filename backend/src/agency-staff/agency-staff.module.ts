import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AgencyStaffController } from './agency-staff.controller';
import { AgencyStaffService } from './agency-staff.service';

// AuthGuard's JwtService comes from the globally-registered JwtModule
// (auth.module, `global: true`); PrismaModule is @Global. Import PrismaModule
// explicitly to mirror the sibling feature modules.
@Module({
  imports: [PrismaModule],
  controllers: [AgencyStaffController],
  providers: [AgencyStaffService],
})
export class AgencyStaffModule {}
