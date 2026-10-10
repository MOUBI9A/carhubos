import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiVisionService {
  private readonly logger = new Logger(AiVisionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Preview-only damage-analysis pipeline.
   *
   * IMPORTANT: this method does not run a real computer-vision model yet.
   * It returns deterministic simulated detections so the rest of the product
   * flow can be exercised without presenting the result as real inference.
   * Replace this implementation behind a provider abstraction before enabling
   * automated damage recognition in production.
   */
  async analyzeVehicle(agencyId: string, carId: string, imageBuffer: Buffer) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true },
    });
    if (!car) throw new NotFoundException('Car not found');

    // Keep the parameter intentionally referenced: the preview route still
    // validates that an image was uploaded even though no inference runs yet.
    void imageBuffer;

    this.logger.warn(
      `Running AI Vision simulation preview for car ${carId}; no live CV provider is configured.`,
    );

    // Small delay keeps the preview interaction realistic without pretending
    // that an external model call occurred.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const detections = [
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
      isSimulation: true,
      model: 'Preview Simulation',
      notice:
        'Preview only — these detections are simulated and are not the result of live computer-vision inference.',
    };
  }

  async getRecentScans(agencyId: string) {
    void agencyId;
    return [];
  }
}
