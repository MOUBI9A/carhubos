import { Injectable, Logger } from '@nestjs/common';
import { VisionProvider, VisionAnalysisResult, DamageDetection } from './vision-provider.interface';

@Injectable()
export class SimulationVisionProvider implements VisionProvider {
  private readonly logger = new Logger(SimulationVisionProvider.name);

  readonly name = 'SimulationVisionProvider';
  readonly isSimulation = true;

  isAvailable(): boolean {
    return true;
  }

  async analyzeImage(carId: string, imageBuffer: Buffer): Promise<VisionAnalysisResult> {
    const start = Date.now();
    this.logger.log(`Executing simulated vehicle damage scan for car ${carId}...`);

    if (process.env.NODE_ENV !== 'test') {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    const detections: DamageDetection[] = [
      {
        type: 'SCRATCH',
        location: 'Rear Left Door',
        severity: 'LOW',
        confidence: 0.94,
        coordinates: { x: 450, y: 320, width: 50, height: 20 },
      },
      {
        type: 'DENT',
        location: 'Front Bumper',
        severity: 'MEDIUM',
        confidence: 0.88,
        coordinates: { x: 120, y: 580, width: 80, height: 80 },
      },
    ];

    const integrityScore = Math.max(0, 100 - detections.length * 12);

    return {
      carId,
      timestamp: new Date(),
      integrityScore,
      detections,
      model: 'VisionTransformer-v4.2 (Simulation)',
      isSimulation: true,
      notice: 'Simulation preview: cloud CV provider integration ready; live model credentials not configured.',
      latencyMs: Date.now() - start,
    };
  }
}
