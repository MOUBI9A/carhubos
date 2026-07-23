import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Optional post-payment redirect targets. Kept as bounded strings (not @IsUrl)
 * so localhost / relative dev URLs are accepted; the gateway adapter is
 * responsible for anything it needs beyond a plain string.
 */
export class CreateCheckoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  successUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelUrl?: string;
}
