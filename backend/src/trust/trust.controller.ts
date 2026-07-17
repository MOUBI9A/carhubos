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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TrustService } from './trust.service';
import {
  AssessDto,
  CreateReviewDto,
  CreateBlacklistDto,
  LiftBlacklistDto,
} from './dto/trust.dto';

@Controller('trust')
@UseGuards(AuthGuard)
export class TrustController {
  constructor(private readonly trust: TrustService) {}

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
  createBlacklist(@CurrentUser() user: any, @Body() dto: CreateBlacklistDto) {
    return this.trust.createBlacklistEntry(user.agencyId, dto);
  }

  @Patch('blacklist/:id/lift')
  lift(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: LiftBlacklistDto,
  ) {
    return this.trust.liftBlacklistEntry(user.agencyId, id, dto.note);
  }

  @Get('blacklist')
  listBlacklist(@CurrentUser() user: any) {
    return this.trust.listBlacklist(user.agencyId);
  }

  @Post('backfill')
  backfill() {
    return this.trust.backfillIdentities();
  }
}
