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
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ai-vision')
@UseGuards(AuthGuard)
export class AiVisionController {
  constructor(private readonly aiVisionService: AiVisionService) {}

  @Post('analyze')
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

    return this.aiVisionService.analyzeVehicle(carId, file.buffer);
  }

  @Get('recent')
  async getRecent(@CurrentUser() user: any) {
    return this.aiVisionService.getRecentScans(user.agencyId);
  }
}
