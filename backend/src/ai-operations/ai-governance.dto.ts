import { IsBoolean, IsIn, IsInt, Max, Min } from 'class-validator';

/** Full replacement, versioned; no provider token, personal data or SQL input. */
export class UpdateAiGovernanceDto {
  @IsInt()
  @Min(0)
  expectedRevision: number;

  @IsBoolean()
  requestedEnabled: boolean;

  @IsIn(['EN', 'FR', 'AR'])
  preferredLanguage: 'EN' | 'FR' | 'AR';

  @IsInt()
  @Min(0)
  @Max(100000)
  monthlyBudgetUsdCents: number;

  @IsInt()
  @Min(0)
  @Max(10000)
  monthlyRequestLimit: number;
}
