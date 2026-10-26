import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateRulesService } from './rate-rules.service';
import {
  CreateRateRuleDto,
  QuoteQueryDto,
  SetVehicleClassDto,
  UpdateRateRuleDto,
} from './dto/rate-rule.dto';

/**
 * Rate tiers & seasonality. Every handler is keyed on the caller's JWT
 * `agencyId`.
 *
 * Capabilities: writing pricing rules changes what customers are charged, so
 * it needs `settings.manage` (owner-level). READING a quote only needs
 * `booking.create` — front-desk staff must be able to quote a price without
 * being able to change the price list.
 */
@Controller('pricing')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class PricingController {
  constructor(private readonly rateRules: RateRulesService) {}

  @Get('rules')
  @RequireCapabilities('settings.manage')
  list(@CurrentUser() user: any) {
    return this.rateRules.list(user.agencyId);
  }

  @Post('rules')
  @RequireCapabilities('settings.manage')
  create(@CurrentUser() user: any, @Body() dto: CreateRateRuleDto) {
    return this.rateRules.create(user.agencyId, user.id, dto);
  }

  @Put('rules/:id')
  @RequireCapabilities('settings.manage')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRateRuleDto,
  ) {
    return this.rateRules.update(user.agencyId, id, user.id, dto);
  }

  @Delete('rules/:id')
  @RequireCapabilities('settings.manage')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.rateRules.remove(user.agencyId, id, user.id);
  }

  @Patch('cars/:carId/class')
  @RequireCapabilities('fleet.manage')
  setVehicleClass(
    @CurrentUser() user: any,
    @Param('carId') carId: string,
    @Body() dto: SetVehicleClassDto,
  ) {
    return this.rateRules.setVehicleClass(
      user.agencyId,
      carId,
      user.id,
      dto.vehicleClass,
    );
  }

  /** Price preview for the booking modal — same engine the booking uses. */
  @Get('quote')
  @RequireCapabilities('booking.create')
  quote(@CurrentUser() user: any, @Query() q: QuoteQueryDto) {
    return this.rateRules.quote(user.agencyId, q.carId, q.startDate, q.endDate);
  }
}
