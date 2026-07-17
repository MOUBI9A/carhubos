import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('expenses')
@UseGuards(AuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() body: { category: string; description: string; amount: number; date?: string },
  ) {
    return this.expensesService.create(user.agencyId, body);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.expensesService.findAll(user.agencyId);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: any) {
    return this.expensesService.getSummary(user.agencyId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { category?: string; description?: string; amount?: number; status?: string },
  ) {
    return this.expensesService.update(user.agencyId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expensesService.remove(user.agencyId, id);
  }
}
