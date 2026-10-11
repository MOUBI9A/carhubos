import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { FEATURE_FLAGS } from '../feature-flags/feature-flags.types';
import { SimulationVisionProvider } from './providers/simulation-vision.provider';
import { CloudVisionProvider } from './providers/cloud-vision.provider';
import { VisionAnalysisResult, VisionProvider } from './providers/vision-provider.interface';

@Injectable()
export class AiVisionService {
  private readonly logger = new Logger(AiVisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly simulationProvider: SimulationVisionProvider,
    private readonly cloudProvider: CloudVisionProvider,
  ) {}

  /**
   * Orchestrates vehicle damage image analysis through configured vision providers.
   */
  async analyzeVehicle(
    agencyId: string,
    carId: string,
    imageBuffer: Buffer,
  ): Promise<VisionAnalysisResult> {
    // 1. Server-side Feature Flag Check
    if (!this.featureFlags.isEnabled(FEATURE_FLAGS.AI_DAMAGE_DETECTION, { agencyId })) {
      throw new ForbiddenException(
        'AI Damage Detection is currently disabled on this environment.',
      );
    }

    // 2. Tenant-scoped vehicle verification
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true, brand: true, model: true },
    });
    if (!car) {
      throw new NotFoundException('Car not found');
    }

    // 3. Provider Selection & Routing
    const provider = this.resolveActiveProvider();
    this.logger.log(
      `Analyzing vehicle ${carId} using provider "${provider.name}" (isSimulation: ${provider.isSimulation})`,
    );

    // 4. Execution
    const rawResult = await provider.analyzeImage(carId, imageBuffer);

    // 5. Normalization & Confidence Threshold Filtering (>= 0.50)
    const filteredDetections = rawResult.detections.filter((d) => d.confidence >= 0.5);

    // Integrity score recalculation based on filtered detections
    const integrityScore = Math.max(0, 100 - filteredDetections.length * 12);

    return {
      ...rawResult,
      detections: filteredDetections,
      integrityScore,
    };
  }

  /**
   * Resolves active vision provider based on feature flags and provider availability.
   */
  private resolveActiveProvider(): VisionProvider {
    const cloudEnabled = this.featureFlags.isEnabled(FEATURE_FLAGS.CLOUD_VISION_INFERENCE);
    if (cloudEnabled && this.cloudProvider.isAvailable()) {
      return this.cloudProvider;
    }
    return this.simulationProvider;
  }

  /**
   * Fetches recent inspection scans for agency fleet.
   */
  async getRecentScans(agencyId: string) {
    const inspections = await this.prisma.inspection.findMany({
      where: {
        car: { agencyId },
        damages: { not: null },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        car: {
          select: {
            id: true,
            brand: true,
            model: true,
            licensePlate: true,
          },
        },
        inspector: {
          select: {
            name: true,
          },
        },
      },
    });

    return inspections.map((insp) => {
      let parsedDamages: any[] = [];
      if (insp.damages) {
        try {
          const parsed = JSON.parse(insp.damages);
          if (Array.isArray(parsed)) parsedDamages = parsed;
        } catch {
          parsedDamages = [];
        }
      }

      return {
        id: insp.id,
        carId: insp.carId,
        car: insp.car,
        inspector: insp.inspector?.name ?? 'System',
        createdAt: insp.createdAt,
        type: insp.type,
        damages: parsedDamages,
      };
    });
  }
}
