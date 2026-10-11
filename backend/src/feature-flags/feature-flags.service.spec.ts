import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagsService } from './feature-flags.service';
import { FEATURE_FLAGS } from './feature-flags.types';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FF_EXPERIMENTAL_TELEMATICS') return 'true';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should return baseline defaults when no env override exists', () => {
    expect(service.isEnabled(FEATURE_FLAGS.AI_DAMAGE_DETECTION)).toBe(true);
    expect(service.isEnabled(FEATURE_FLAGS.CLOUD_VISION_INFERENCE)).toBe(false);
  });

  it('should respect environment variable overrides', () => {
    expect(service.isEnabled(FEATURE_FLAGS.EXPERIMENTAL_TELEMATICS)).toBe(true);
  });

  it('should allow runtime overrides to supersede defaults and env variables', () => {
    service.setOverride(FEATURE_FLAGS.EXPERIMENTAL_TELEMATICS, false);
    expect(service.isEnabled(FEATURE_FLAGS.EXPERIMENTAL_TELEMATICS)).toBe(false);

    service.clearOverride(FEATURE_FLAGS.EXPERIMENTAL_TELEMATICS);
    expect(service.isEnabled(FEATURE_FLAGS.EXPERIMENTAL_TELEMATICS)).toBe(true);
  });

  it('should return all flags dictionary for client applications', () => {
    const flags = service.getAllFlags();
    expect(flags[FEATURE_FLAGS.AI_DAMAGE_DETECTION]).toBe(true);
    expect(flags[FEATURE_FLAGS.CLOUD_VISION_INFERENCE]).toBe(false);
  });
});
