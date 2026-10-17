import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IPartsProvider } from './providers/parts-provider.interface';
import { PARTS_PROVIDER } from './providers/parts-provider.interface';
import { DtcPartsQueryDto, SearchPartsDto } from './dto/parts-query.dto';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartsService {
  constructor(
    @Inject(PARTS_PROVIDER)
    private readonly provider: IPartsProvider,
    private readonly entitlements: EntitlementsService,
    private readonly prisma: PrismaService,
  ) {}

  private scope(agencyId: string) {
    if (!agencyId) {
      throw new ForbiddenException('An agency context is required');
    }
  }

  async search(agencyId: string, dto: SearchPartsDto) {
    this.scope(agencyId);
    await this.entitlements.assertOperating(agencyId);

    // If a VIN was provided, look up any existing diagnostic vehicle in this agency
    const engine = dto.engine;
    let make = dto.make;
    let model = dto.model;

    if (dto.vin) {
      const vehicle = await this.prisma.diagnosticVehicle.findFirst({
        where: { vin: dto.vin.trim().toUpperCase(), agencyId },
      });
      if (vehicle) {
        make = make ?? vehicle.brand;
        model = model ?? vehicle.model;
      }
    }

    return this.provider.search(dto.query ?? '', {
      make,
      model,
      year: dto.year,
      engine,
      vin: dto.vin,
    });
  }

  async getRecommendationsForDtc(
    agencyId: string,
    dtcCode: string,
    query: DtcPartsQueryDto,
  ) {
    this.scope(agencyId);
    await this.entitlements.assertOperating(agencyId);

    return this.provider.getRecommendationsForDtc(dtcCode, {
      make: query.make,
      model: query.model,
      engine: query.engine,
    });
  }

  async getCrossReferences(agencyId: string, partOrOemNumber: string) {
    this.scope(agencyId);
    await this.entitlements.assertOperating(agencyId);

    const result = await this.provider.getCrossReferences(partOrOemNumber);
    if (!result.parts.length) {
      throw new NotFoundException(`No parts found for identifier ${partOrOemNumber}`);
    }
    return result;
  }
}
