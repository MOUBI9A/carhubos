import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AiVisionService } from './ai-vision.service';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { SimulationVisionProvider } from './providers/simulation-vision.provider';
import { CloudVisionProvider } from './providers/cloud-vision.provider';

describe('AiVisionService', () => {
  let service: AiVisionService;
  let prisma: {
    car: { findFirst: jest.Mock };
    inspection: { findMany: jest.Mock };
  };
  let featureFlags: {
    isEnabled: jest.Mock;
  };
  let simulationProvider: SimulationVisionProvider;
  let cloudProvider: {
    isAvailable: jest.Mock;
    analyzeImage: jest.Mock;
    name: string;
    isSimulation: boolean;
  };

  beforeEach(async () => {
    prisma = {
      car: {
        findFirst: jest.fn(),
      },
      inspection: {
        findMany: jest.fn(),
      },
    };

    featureFlags = {
      isEnabled: jest.fn((flag: string) => {
        if (flag === 'ai_damage_detection') return true;
        if (flag === 'cloud_vision_inference') return false;
        return true;
      }),
    };

    cloudProvider = {
      name: 'CloudVisionProvider',
      isSimulation: false,
      isAvailable: jest.fn().mockReturnValue(false),
      analyzeImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiVisionService,
        SimulationVisionProvider,
        { provide: PrismaService, useValue: prisma },
        { provide: FeatureFlagsService, useValue: featureFlags },
        { provide: CloudVisionProvider, useValue: cloudProvider },
      ],
    }).compile();

    service = module.get<AiVisionService>(AiVisionService);
    simulationProvider = module.get<SimulationVisionProvider>(SimulationVisionProvider);
  });

  describe('analyzeVehicle', () => {
    it('throws ForbiddenException when feature flag is disabled', async () => {
      featureFlags.isEnabled.mockReturnValue(false);

      await expect(
        service.analyzeVehicle('agency-a', 'car-1', Buffer.from('img')),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when car does not belong to the agency', async () => {
      prisma.car.findFirst.mockResolvedValue(null);

      await expect(
        service.analyzeVehicle('agency-a', 'car-other-agency', Buffer.from('mock-image')),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.car.findFirst).toHaveBeenCalledWith({
        where: { id: 'car-other-agency', agencyId: 'agency-a' },
        select: { id: true, brand: true, model: true },
      });
    });

    it('routes to SimulationVisionProvider when cloud inference flag is disabled', async () => {
      prisma.car.findFirst.mockResolvedValue({ id: 'car-123', brand: 'Dacia', model: 'Logan' });

      const result = await service.analyzeVehicle('agency-a', 'car-123', Buffer.from('mock-image'));

      expect(result).toBeDefined();
      expect(result.carId).toBe('car-123');
      expect(result.integrityScore).toBeGreaterThanOrEqual(0);
      expect(result.integrityScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.detections)).toBe(true);
      expect(result.model).toContain('VisionTransformer-v4.2 (Simulation)');
      expect(result.isSimulation).toBe(true);
      expect(result.notice).toContain('Simulation preview');
    });

    it('routes to CloudVisionProvider when enabled and available', async () => {
      featureFlags.isEnabled.mockImplementation((flag: string) => {
        if (flag === 'ai_damage_detection') return true;
        if (flag === 'cloud_vision_inference') return true;
        return true;
      });
      cloudProvider.isAvailable.mockReturnValue(true);
      cloudProvider.analyzeImage.mockResolvedValue({
        carId: 'car-123',
        timestamp: new Date(),
        integrityScore: 85,
        detections: [
          {
            type: 'DENT',
            location: 'Front Bumper',
            severity: 'HIGH',
            confidence: 0.95,
            coordinates: { x: 10, y: 10, width: 20, height: 20 },
          },
        ],
        model: 'AWS-Rekognition-CustomLabels',
        isSimulation: false,
      });

      prisma.car.findFirst.mockResolvedValue({ id: 'car-123', brand: 'Porsche', model: 'Macan' });

      const result = await service.analyzeVehicle('agency-a', 'car-123', Buffer.from('img'));
      expect(result.model).toBe('AWS-Rekognition-CustomLabels');
      expect(result.isSimulation).toBe(false);
      expect(cloudProvider.analyzeImage).toHaveBeenCalled();
    });
  });

  describe('getRecentScans', () => {
    it('queries inspections scoped to the given agency with safe json parsing', async () => {
      prisma.inspection.findMany.mockResolvedValue([
        {
          id: 'insp-1',
          carId: 'car-1',
          car: { id: 'car-1', brand: 'Dacia', model: 'Logan', licensePlate: '1234-A-1' },
          inspector: { name: 'Agent Omar' },
          createdAt: new Date('2026-10-01T10:00:00Z'),
          type: 'POST_RENTAL',
          damages: JSON.stringify([{ type: 'SCRATCH', location: 'Left Bumper', cost: 350 }]),
        },
      ]);

      const scans = await service.getRecentScans('agency-a');
      expect(scans.length).toBe(1);
      expect(scans[0].damages).toEqual([{ type: 'SCRATCH', location: 'Left Bumper', cost: 350 }]);
    });
  });
});
