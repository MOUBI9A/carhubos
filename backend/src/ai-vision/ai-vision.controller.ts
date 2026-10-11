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
import { AnalyzeVehicleDto } from './dto/analyze-vehicle.dto';

export const AI_VISION_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const AI_VISION_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

@Controller('ai-vision')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class AiVisionController {
  constructor(private readonly aiVisionService: AiVisionService) {}

  @Post('analyze')
  @RequireCapabilities('fleet.view')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: AI_VISION_MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!AI_VISION_ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
          cb(
            new BadRequestException(
              `Unsupported image type "${file.mimetype}". Allowed: ${AI_VISION_ALLOWED_MIME_TYPES.join(', ')}.`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async analyze(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AnalyzeVehicleDto,
  ) {
    if (!file) {
      throw new BadRequestException('No image provided for analysis.');
    }

    return this.aiVisionService.analyzeVehicle(user.agencyId, dto.carId, file.buffer);
  }

  @Get('recent')
  @RequireCapabilities('fleet.view')
  async getRecent(@CurrentUser() user: any) {
    return this.aiVisionService.getRecentScans(user.agencyId);
  }
}
