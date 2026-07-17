import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TrustService } from './trust.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AssessDto,
  CreateReviewDto,
  CreateBlacklistDto,
  LiftBlacklistDto,
} from './dto/trust.dto';

@Controller('trust')
// RolesGuard is a no-op on handlers without @Roles metadata, so routes
// left open below (assess/reviews/list) stay open to any authenticated user.
@UseGuards(AuthGuard, RolesGuard)
export class TrustController {
  constructor(
    private readonly trust: TrustService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // POST (not GET) so the customer id never lands in a URL / access log.
  @Post('assess')
  assess(@CurrentUser() user: any, @Body() dto: AssessDto) {
    return this.trust.assess(user.agencyId, dto.customerId);
  }

  @Post('reviews')
  createReview(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.trust.createReview(user.agencyId, dto);
  }

  @Post('blacklist')
  @Roles('MANAGER', 'OWNER')
  async createBlacklist(
    @CurrentUser() user: any,
    @Body() dto: CreateBlacklistDto,
  ) {
    const entry = await this.trust.createBlacklistEntry(user.agencyId, dto);
    await this.auditLogs.log(
      user.agencyId,
      user.id,
      'CREATE_BLACKLIST_ENTRY',
      'BLACKLIST_ENTRY',
      entry.id,
      undefined,
      { customerId: dto.customerId, reason: dto.reason, severity: dto.severity },
    );
    return entry;
  }

  @Patch('blacklist/:id/lift')
  @Roles('MANAGER', 'OWNER')
  async lift(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: LiftBlacklistDto,
  ) {
    const updated = await this.trust.liftBlacklistEntry(
      user.agencyId,
      id,
      dto.note,
    );
    await this.auditLogs.log(
      user.agencyId,
      user.id,
      'LIFT_BLACKLIST_ENTRY',
      'BLACKLIST_ENTRY',
      id,
      undefined,
      { status: 'LIFTED', note: dto.note },
    );
    return updated;
  }

  @Get('blacklist')
  listBlacklist(@CurrentUser() user: any) {
    return this.trust.listBlacklist(user.agencyId);
  }

  @Post('backfill')
  @Roles('ROOT_ADMIN')
  backfill() {
    return this.trust.backfillIdentities();
  }
}
