import { BadRequestException, NotFoundException, PayloadTooLargeException, ServiceUnavailableException } from '@nestjs/common';
import { AiVisionController } from './ai-vision.controller';
import { AiVisionService } from './ai-vision.service';
import { PrismaService } from '../prisma/prisma.service';

describe('honest AI vision availability', () => {
  const findFirst = jest.fn();
  const service = new AiVisionService({ car: { findFirst } } as unknown as PrismaService);
  const controller = new AiVisionController(service);
  const image = (buffer: Buffer, mimetype = 'image/jpeg') => ({ buffer, mimetype }) as Express.Multer.File;
  beforeEach(() => { findFirst.mockReset(); });
  it('never fabricates damage detections for an owned car', async () => {
    findFirst.mockResolvedValue({ id: 'car' });
    await expect(controller.analyze({ agencyId: 'agency' }, image(Buffer.from([255, 216, 255])), { carId: 'car' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'car', agencyId: 'agency' }, select: { id: true } });
  });
  it('preserves cross-tenant 404 before integration status', async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.analyzeVehicle('agency', 'other-car', Buffer.alloc(0))).rejects.toBeInstanceOf(NotFoundException);
  });
  it('rejects renamed nonimage content without a DB query', async () => {
    await expect(controller.analyze({ agencyId: 'agency' }, image(Buffer.from('<script>')), { carId: 'car' })).rejects.toBeInstanceOf(BadRequestException);
    expect(findFirst).not.toHaveBeenCalled();
  });
  it('rejects oversized images without a DB query', async () => {
    await expect(controller.analyze({ agencyId: 'agency' }, image(Buffer.alloc(5 * 1024 * 1024 + 1)), { carId: 'car' })).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(findFirst).not.toHaveBeenCalled();
  });
  it('requires an image', async () => {
    await expect(controller.analyze({ agencyId: 'agency' }, undefined as unknown as Express.Multer.File, { carId: 'car' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
