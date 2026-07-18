import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiVisionService } from './ai-vision.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';

@Controller('ai-vision')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class AiVisionController {
  constructor(private readonly aiVisionService: AiVisionService) {}

  @Post('analyze')
  @RequireCapabilities('fleet.view')
  @UseInterceptors(FileInterceptor('image'))
  async analyze(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('carId') carId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No image provided for analysis.');
    }
    if (!carId) {
      throw new BadRequestException('carId is required.');
    }

    return this.aiVisionService.analyzeVehicle(user.agencyId, carId, file.buffer);
  }

  @Get('recent')
  @RequireCapabilities('fleet.view')
  async getRecent(@CurrentUser() user: any) {
    return this.aiVisionService.getRecentScans(user.agencyId);
  }
}
