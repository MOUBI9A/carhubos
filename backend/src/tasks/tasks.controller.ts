import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TasksService } from './tasks.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';

class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

class UpdateTaskStatusDto {
  @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
  status!: string;
}

@Controller('tasks')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequireCapabilities('booking.view')
  findAll(@CurrentUser() user: any, @Query('assigneeId') assigneeId?: string) {
    return assigneeId
      ? this.tasksService.findAllByAssignee(user.agencyId, assigneeId)
      : this.tasksService.findAll(user.agencyId);
  }

  @Post()
  @RequireCapabilities('booking.manage')
  create(@CurrentUser() user: any, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.agencyId, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  @Patch(':id/status')
  @RequireCapabilities('booking.manage')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(user.agencyId, id, dto.status);
  }
}
