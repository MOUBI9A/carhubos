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
import {
  CreateRefusalLogDto,
  UpdateRefusalStatusDto,
} from './dto/refusal-logs.dto';

@Controller('refusal-logs')
@UseGuards(AuthGuard)
export class RefusalLogsController {
  constructor(private readonly refusalLogsService: RefusalLogsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateRefusalLogDto) {
    return this.refusalLogsService.create(user.agencyId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.refusalLogsService.findAll(user.agencyId);
  }

  /** Legacy route — kept for backward compatibility */
  @Patch(':id/recovered')
  markAsRecovered(@CurrentUser() user: any, @Param('id') id: string) {
    return this.refusalLogsService.markAsRecovered(user.agencyId, id);
  }

  /** Generic status update: body { status: 'RECOVERED' | 'LOST' } */
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRefusalStatusDto,
  ) {
    return this.refusalLogsService.updateStatus(user.agencyId, id, dto.status);
  }
}
