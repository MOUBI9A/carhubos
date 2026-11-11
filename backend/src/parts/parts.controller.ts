import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { PartsService } from './parts.service';
import { DtcPartsQueryDto, SearchPartsDto } from './dto/parts-query.dto';

interface Actor {
  id: string;
  agencyId: string;
  role: string;
}

@Controller('parts')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Get('search')
  @RequireCapabilities('diagnostics.view')
  async search(
    @CurrentUser() user: Actor,
    @Query() query: SearchPartsDto,
  ) {
    return this.partsService.search(user.agencyId, query);
  }

  @Get('dtc/:code')
  @RequireCapabilities('diagnostics.view')
  async getForDtc(
    @CurrentUser() user: Actor,
    @Param('code') code: string,
    @Query() query: DtcPartsQueryDto,
  ) {
    return this.partsService.getRecommendationsForDtc(user.agencyId, code, query);
  }

  @Get('cross-reference/:number')
  @RequireCapabilities('diagnostics.view')
  async getCrossReference(
    @CurrentUser() user: Actor,
    @Param('number') number: string,
  ) {
    return this.partsService.getCrossReferences(user.agencyId, number);
  }
}
