import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('expenses')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @RequireCapabilities('expense.manage')
  create(
    @CurrentUser() user: any,
    @Body() body: { category: string; description: string; amount: number; date?: string },
  ) {
    return this.expensesService.create(user.agencyId, body);
  }

  @Get()
  @RequireCapabilities('finance.view')
  findAll(@CurrentUser() user: any) {
    return this.expensesService.findAll(user.agencyId);
  }

  @Get('summary')
  @RequireCapabilities('finance.view')
  getSummary(@CurrentUser() user: any) {
    return this.expensesService.getSummary(user.agencyId);
  }

  @Patch(':id')
  @RequireCapabilities('expense.manage')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { category?: string; description?: string; amount?: number; status?: string },
  ) {
    return this.expensesService.update(user.agencyId, id, body);
  }

  @Delete(':id')
  @RequireCapabilities('expense.manage')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expensesService.remove(user.agencyId, id);
  }
}
