import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './dto/customers.dto';
import { BlacklistCustomerDto } from './dto/blacklist-customer.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Agency's OWN customer records (a store the agency legitimately owns). Still
// capability-gated, not bare AuthGuard: reads need `customer.view`, writes need
// `customer.manage`. This is DISTINCT from the renter's global RenterDocument
// vault, which is reachable only via an active ConsentGrant (see ConsentService).
@Controller('customers')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequireCapabilities('customer.manage')
  create(
    @CurrentUser() user: any,
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    return this.customersService.create(user.agencyId, createCustomerDto);
  }

  @Get()
  @RequireCapabilities('customer.view')
  findAll(@CurrentUser() user: any, @Query() query: ListCustomersQueryDto) {
    return this.customersService.findAll(user.agencyId, query);
  }

  /**
   * Must be declared BEFORE `/:id` so NestJS does not
   * swallow "blacklisted" as a dynamic :id segment.
   */
  @Get('blacklisted')
  @RequireCapabilities('customer.view')
  getBlacklisted(@CurrentUser() user: any) {
    return this.customersService.getBlacklisted(user.agencyId);
  }

  @Get(':id')
  @RequireCapabilities('customer.view')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.findOne(user.agencyId, id);
  }

  @Patch(':id')
  @RequireCapabilities('customer.manage')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user.agencyId, id, updateCustomerDto);
  }

  @Patch(':id/blacklist')
  @RequireCapabilities('customer.manage')
  blacklist(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: BlacklistCustomerDto,
  ) {
    return this.customersService.blacklist(
      user.agencyId,
      id,
      dto.reason,
      user.id,
    );
  }

  @Patch(':id/unblacklist')
  @RequireCapabilities('customer.manage')
  unblacklist(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.unblacklist(user.agencyId, id, user.id);
  }

  @Delete(':id')
  @RequireCapabilities('customer.manage')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.remove(user.agencyId, id);
  }
}
