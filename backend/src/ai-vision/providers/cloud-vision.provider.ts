import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VisionProvider, VisionAnalysisResult } from './vision-provider.interface';

@Injectable()
export class CloudVisionProvider implements VisionProvider {
  private readonly logger = new Logger(CloudVisionProvider.name);

  readonly name = 'CloudVisionProvider';
  readonly isSimulation = false;

  constructor(private readonly config: ConfigService) {}

  isAvailable(): boolean {
    const apiKey =
      this.config.get<string>('CLOUD_VISION_API_KEY') ||
      this.config.get<string>('AWS_REKOGNITION_ACCESS_KEY');
    return !!apiKey;
  }

  async analyzeImage(carId: string, imageBuffer: Buffer): Promise<VisionAnalysisResult> {
    if (!this.isAvailable()) {
      throw new ServiceUnavailableException(
        'Cloud vision provider is not available: external CV credentials (CLOUD_VISION_API_KEY) are unconfigured.',
      );
    }

    this.logger.log(`Invoking cloud computer vision inference for car ${carId}...`);
    // Placeholder for live cloud inference call once credentials are provided
    throw new ServiceUnavailableException('Cloud vision inference endpoint not configured.');
  }
}
