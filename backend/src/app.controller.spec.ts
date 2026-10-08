import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';

describe('AppController', () => {
  const transaction = jest.fn();
  let appController: AppController;

  beforeEach(async () => {
    transaction.mockReset();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: { $transaction: transaction } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('reports readiness only after a bounded database probe', async () => {
    const execute = jest.fn().mockResolvedValue(0);
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    transaction.mockImplementation(async (probe: (tx: unknown) => Promise<void>) => probe({ $executeRawUnsafe: execute, $queryRaw: query }));
    await expect(appController.ready()).resolves.toEqual({ status: 'ok', database: 'up' });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { maxWait: 1000, timeout: 1500 });
    expect(execute).toHaveBeenCalledWith("SET LOCAL statement_timeout = '1000ms'");
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable without leaking database errors', async () => {
    transaction.mockRejectedValue(new Error('postgresql://secret-password@host'));
    await expect(appController.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
    try { await appController.ready(); } catch (error) {
      expect(JSON.stringify((error as ServiceUnavailableException).getResponse())).not.toContain('secret-password');
    }
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
