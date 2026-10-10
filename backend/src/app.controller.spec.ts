import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('reports process liveness without touching the database', () => {
      expect(appController.health()).toEqual(
        expect.objectContaining({ status: 'ok', service: 'fider-api' }),
      );
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('ready', () => {
    it('reports ready when the database responds', async () => {
      await expect(appController.ready()).resolves.toEqual(
        expect.objectContaining({
          status: 'ready',
          service: 'fider-api',
          database: 'reachable',
        }),
      );
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('fails closed when the database is unavailable', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('db unavailable'));

      await expect(appController.ready()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
