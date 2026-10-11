import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    prisma = app.get<PrismaService>(PrismaService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return liveness status ok and uptime', () => {
      const res = appController.health();
      expect(res.status).toBe('ok');
      expect(res.version).toBe('1.0.0-pilot');
      expect(res.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('readiness', () => {
    it('should return readiness status with database connectivity and memory stats', async () => {
      const res = await appController.readiness();
      expect(res.status).toBe('ok');
      expect(res.database.status).toBe('connected');
      expect(res.memory.heapUsedMb).toBeGreaterThan(0);
    });

    it('should throw ServiceUnavailableException if database query fails', async () => {
      jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Connection terminated'));
      await expect(appController.readiness()).rejects.toThrow();
    });
  });
});
