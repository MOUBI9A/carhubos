import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'CHEQUE'] as const;
export const PAYMENT_TYPES = ['INCOME', 'REFUND'] as const;

export class CreatePaymentDto {
  @IsUUID(undefined, { message: 'A valid invoice is required' })
  @IsNotEmpty()
  invoiceId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @IsIn([...PAYMENT_TYPES], {
    message: `type must be one of ${PAYMENT_TYPES.join(', ')}`,
  })
  type: (typeof PAYMENT_TYPES)[number];

  @IsOptional()
  @IsIn([...PAYMENT_METHODS], {
    message: `method must be one of ${PAYMENT_METHODS.join(', ')}`,
  })
  method?: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  /**
   * When true (default for OWNER/MANAGER), the payment is VERIFIED immediately
   * and the invoice is reconciled. When false, it lands as PENDING for later
   * verify via PATCH /payments/:id/verify.
   */
  @IsOptional()
  autoVerify?: boolean;
}
