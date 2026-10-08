import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiVisionService } from './ai-vision.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { AnalyzeVehicleDto } from './dto/analyze-vehicle.dto';

@Controller('ai-vision')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class AiVisionController {
  constructor(private readonly aiVisionService: AiVisionService) {}

  @Post('analyze')
  @RequireCapabilities('fleet.view')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, parts: 2, fieldSize: 1024 },
    fileFilter: (_request, file, callback) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        return callback(new BadRequestException('Use a JPEG, PNG or WebP image.'), false);
      }
      callback(null, true);
    },
  }))
  async analyze(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AnalyzeVehicleDto,
  ) {
    if (!file) {
      throw new BadRequestException('No image provided for analysis.');
    }

    if (file.buffer.length > 5 * 1024 * 1024) {
      throw new PayloadTooLargeException('Image must be at most 5 MB.');
    }
    const buffer = file.buffer;
    const jpeg = buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    const png = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    if (!((file.mimetype === 'image/jpeg' && jpeg) || (file.mimetype === 'image/png' && png) || (file.mimetype === 'image/webp' && webp))) {
      throw new BadRequestException('Image content does not match its supported format.');
    }
    return this.aiVisionService.analyzeVehicle(user.agencyId, dto.carId, file.buffer);
  }

  @Get('recent')
  @RequireCapabilities('fleet.view')
  async getRecent(@CurrentUser() user: any) {
    return this.aiVisionService.getRecentScans(user.agencyId);
  }
}
