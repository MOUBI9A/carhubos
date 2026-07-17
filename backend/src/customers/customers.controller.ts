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
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    return this.customersService.create(user.agencyId, createCustomerDto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: ListCustomersQueryDto) {
    return this.customersService.findAll(user.agencyId, query);
  }

  /**
   * Must be declared BEFORE `/:id` so NestJS does not
   * swallow "blacklisted" as a dynamic :id segment.
   */
  @Get('blacklisted')
  getBlacklisted(@CurrentUser() user: any) {
    return this.customersService.getBlacklisted(user.agencyId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.findOne(user.agencyId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user.agencyId, id, updateCustomerDto);
  }

  @Patch(':id/blacklist')
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
  unblacklist(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.unblacklist(user.agencyId, id, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.remove(user.agencyId, id);
  }
}
