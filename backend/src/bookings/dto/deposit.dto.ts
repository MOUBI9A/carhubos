import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const DEPOSIT_ACTIONS = ['HOLD', 'RETURN', 'CLAIM'] as const;
export const DEPOSIT_METHODS = ['CASH', 'TRANSFER', 'CHEQUE', 'CARD'] as const;

/**
 * Deposit lifecycle:
 *   PENDING → HOLD   (hand-over / capture)
 *   HELD    → RETURN (release full deposit to renter)
 *   HELD    → CLAIM  (keep deposit + optional damage charge on the invoice)
 */
export class UpdateDepositDto {
  @IsIn([...DEPOSIT_ACTIONS], {
    message: `action must be one of ${DEPOSIT_ACTIONS.join(', ')}`,
  })
  action: (typeof DEPOSIT_ACTIONS)[number];

  /** Optional override of the deposit method at HOLD time. */
  @IsOptional()
  @IsIn([...DEPOSIT_METHODS])
  method?: (typeof DEPOSIT_METHODS)[number];

  /**
   * For CLAIM only: additional damage charge (MAD) booked as VERIFIED INCOME
   * against the booking's invoice. Defaults to 0 (claim deposit only, no extra).
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  claimAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}

export class CaptureDepositDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsIn([...DEPOSIT_METHODS])
  method?: (typeof DEPOSIT_METHODS)[number];
}
