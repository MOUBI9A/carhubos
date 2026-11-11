import { Test, TestingModule } from '@nestjs/testing';
import { PartsService } from './parts.service';
import { PARTS_PROVIDER } from './providers/parts-provider.interface';
import { MoroccoCatalogProvider } from './providers/morocco-catalog.provider';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PartsService & MoroccoCatalogProvider', () => {
  let service: PartsService;
  let mockPrisma: any;
  let mockEntitlements: any;

  beforeEach(async () => {
    mockPrisma = {
      diagnosticVehicle: {
        findFirst: jest.fn(),
      },
    };

    mockEntitlements = {
      assertOperating: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartsService,
        {
          provide: PARTS_PROVIDER,
          useClass: MoroccoCatalogProvider,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EntitlementsService,
          useValue: mockEntitlements,
        },
      ],
    }).compile();

    service = module.get<PartsService>(PartsService);
  });

  it('rejects calls without agency context (fail-closed)', async () => {
    await expect(service.search('', {})).rejects.toThrow(ForbiddenException);
    await expect(service.getRecommendationsForDtc('', 'P0301', {})).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.getCrossReferences('', '0986221057')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('searches parts catalog by keyword and matches Bosch ignition coil', async () => {
    const results = await service.search('agency-1', { query: 'Bosch' });
    expect(results.length).toBeGreaterThan(0);
    const coil = results.find((r) => r.brand === 'Bosch' && r.category === 'Ignition');
    expect(coil).toBeDefined();
    expect(coil?.currency).toBe('MAD');
    expect(coil?.tier).toBe('AFTERMARKET_PREMIUM');
    expect(coil?.supplier).toContain('Maroc');
  });

  it('matches DTC P0301 to spark plug and ignition coil alternatives', async () => {
    const results = await service.getRecommendationsForDtc('agency-1', 'P0301', {});
    expect(results.length).toBeGreaterThan(0);
    const codes = results.flatMap((r) => r.applicableDtcCodes ?? []);
    expect(codes).toContain('P0301');

    // Has both OEM and premium aftermarket alternatives
    const tiers = results.map((r) => r.tier);
    expect(tiers).toContain('AFTERMARKET_PREMIUM');
  });

  it('matches DTC P0171 to Mass Air Flow sensor and Oxygen sensors', async () => {
    const results = await service.getRecommendationsForDtc('agency-1', 'P0171', {});
    expect(results.length).toBeGreaterThan(0);
    const categories = results.map((r) => r.category);
    expect(categories).toContain('Sensors');
  });

  it('cross-references OEM number 04E905110K to Bosch equivalent', async () => {
    const result = await service.getCrossReferences('agency-1', '04E905110K');
    expect(result.oemNumber).toBe('04E905110K');
    expect(result.parts.length).toBeGreaterThan(0);
    const partNumbers = result.parts.map((p) => p.partNumber);
    expect(partNumbers).toContain('04E905110K');
    expect(partNumbers).toContain('0986221057');
  });

  it('throws NotFoundException for unknown part numbers', async () => {
    await expect(
      service.getCrossReferences('agency-1', 'TOTALLY-INVALID-999999'),
    ).rejects.toThrow(NotFoundException);
  });

  it('enriches vehicle specs from VIN if present in agency database', async () => {
    mockPrisma.diagnosticVehicle.findFirst.mockResolvedValue({
      id: 'v-1',
      agencyId: 'agency-1',
      vin: 'WVWZZZAUZHP123456',
      brand: 'Volkswagen',
      model: 'Golf',
    });

    const results = await service.search('agency-1', {
      vin: 'WVWZZZAUZHP123456',
      query: 'Ignition',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(mockPrisma.diagnosticVehicle.findFirst).toHaveBeenCalledWith({
      where: { vin: 'WVWZZZAUZHP123456', agencyId: 'agency-1' },
    });
  });
});
