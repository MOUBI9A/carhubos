import { ServiceUnavailableException } from '@nestjs/common';
import { AiVisionService } from './ai-vision.service';

describe('AiVisionService', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalMode = process.env.AI_VISION_MODE;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    if (originalMode === undefined) delete process.env.AI_VISION_MODE;
    else process.env.AI_VISION_MODE = originalMode;
  });

  function makeService(car: { id: string } | null = { id: 'car-1' }) {
    const prisma = {
      car: {
        findFirst: jest.fn().mockResolvedValue(car),
      },
    };
    return { service: new AiVisionService(prisma as any), prisma };
  }

  it('fails closed in production when no AI mode is explicitly configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AI_VISION_MODE;
    const { service, prisma } = makeService();

    await expect(
      service.analyzeVehicle('agency-a', 'car-1', Buffer.from('image')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.car.findFirst).not.toHaveBeenCalled();
  });

  it('returns an explicitly labelled simulation when preview mode is enabled', async () => {
    process.env.NODE_ENV = 'test';
    process.env.AI_VISION_MODE = 'simulation';
    const { service, prisma } = makeService();

    const result = await service.analyzeVehicle(
      'agency-a',
      'car-1',
      Buffer.from('image'),
    );

    expect(prisma.car.findFirst).toHaveBeenCalledWith({
      where: { id: 'car-1', agencyId: 'agency-a' },
      select: { id: true },
    });
    expect(result).toEqual(
      expect.objectContaining({
        carId: 'car-1',
        isSimulation: true,
        model: 'Preview Simulation',
      }),
    );
    expect(result.notice).toMatch(/simulated/i);
  });
});
