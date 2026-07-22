import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// requestedCarType/status are stored as String on the schema — DTO-constrained
// per CLAUDE.md §5.6. The schema's own comment says "ECONOMY, SUV, LUXURY" but
// that's stale: the live waitlist form (frontend/.../dashboard/waitlist/page.tsx)
// offers a 4th option, COMPACT — matching the real UI, not the stale comment.
export const REFUSAL_CAR_TYPES = ['ECONOMY', 'COMPACT', 'SUV', 'LUXURY'] as const;
export const REFUSAL_STATUSES = ['WAITING', 'RECOVERED', 'LOST'] as const;

export class CreateRefusalLogDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsString()
  @IsIn([...REFUSAL_CAR_TYPES], {
    message: `requestedCarType must be one of ${REFUSAL_CAR_TYPES.join(', ')}`,
  })
  requestedCarType: string;

  @IsDateString({}, { message: 'requestedStartDate must be a valid ISO date' })
  requestedStartDate: string;

  @IsDateString({}, { message: 'requestedEndDate must be a valid ISO date' })
  requestedEndDate: string;

  // Money = Decimal(12,2) on the schema. DTO takes a JS number (the global
  // DecimalToNumberInterceptor also emits numbers); Prisma converts it to a
  // Decimal on write — no manual arithmetic on it here, so no Decimal-API
  // conversion is needed (unlike accidents' estimatedCost, this value is never
  // recomputed).
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  potentialRevenue: number;

  // Optional on create — schema defaults to WAITING. Accepting it lets a
  // future bulk-import mark a log already-resolved, but it must still be a
  // real status.
  @IsOptional()
  @IsString()
  @IsIn([...REFUSAL_STATUSES], {
    message: `status must be one of ${REFUSAL_STATUSES.join(', ')}`,
  })
  status?: string;
}

export class UpdateRefusalStatusDto {
  @IsString()
  @IsIn([...REFUSAL_STATUSES], {
    message: `status must be one of ${REFUSAL_STATUSES.join(', ')}`,
  })
  status: string;
}
