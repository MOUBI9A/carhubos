import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RefusalLogsService } from './refusal-logs.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('refusal-logs')
@UseGuards(AuthGuard)
export class RefusalLogsController {
  constructor(private readonly refusalLogsService: RefusalLogsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.refusalLogsService.create(user.agencyId, data);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.refusalLogsService.findAll(user.agencyId);
  }

  /** Legacy route — kept for backward compatibility */
  @Patch(':id/recovered')
  markAsRecovered(@Param('id') id: string) {
    return this.refusalLogsService.markAsRecovered(id);
  }

  /** Generic status update: body { status: 'RECOVERED' | 'LOST' } */
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.refusalLogsService.updateStatus(user.agencyId, id, status);
  }
}
