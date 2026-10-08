import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiVisionService {
  constructor(private readonly prisma: PrismaService) {}

  async analyzeVehicle(agencyId: string, carId: string, imageBuffer: Buffer) {
    void imageBuffer;
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true },
    });
    if (!car) throw new NotFoundException('Car not found');
    throw new ServiceUnavailableException({
      code: 'AI_VISION_UNAVAILABLE',
      message: 'Vehicle image analysis is unavailable. Use a manual inspection.',
    });
  }

  async getRecentScans(agencyId: string) {
    void agencyId;
    return [];
  }
}
