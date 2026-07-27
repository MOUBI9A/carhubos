import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Agency owner starts an online checkout to upgrade their Fider plan.
 * BETA is deliberately excluded — it's the internal free/unlimited beta tier,
 * never a purchasable target. V1 is upgrades only (checked against sortOrder
 * in CheckoutService); downgrades are support-handled, not validated here.
 */
export class CreateSubscriptionCheckoutDto {
  @IsString()
  @IsIn(['STARTER', 'PRO', 'BUSINESS'])
  planKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  successUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelUrl?: string;
}
