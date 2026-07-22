import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

// status is a real, small enum matching the schema comment exactly (schema.
// prisma's Expense.status: "PENDING, PAID") — safe to lock down, PATCH is not
// currently called from the frontend at all (verified: no `/expenses/${id}`
// PATCH call exists in dashboard/finance/page.tsx), so there is no live UI
// contract to break.
export const EXPENSE_STATUSES = ['PENDING', 'PAID'] as const;

// `category` is deliberately left as a plain non-empty string, NOT an `@IsIn`
// enum. The schema's own comment claims `SALARY, RENT, UTILITIES, MARKETING,
// TAX, OTHER`, but the live "Record an expense" form
// (dashboard/finance/page.tsx) actually submits free-text option labels —
// "Maintenance & Spare Parts", "Staff Salary Payout", "Real Estate / Rent",
// "Marketing & Acquisition", "Utility Infrastructure" — none of which match
// the commented enum, and there's a 6th commented value (TAX) with no UI
// option at all. Locking to either list would either 400 every real save from
// the live form (the schema's list) or bake in freeform display strings as a
// permanent "enum" (the UI's list) — that's a product decision on the
// canonical category taxonomy, not a validation-hardening call. Flagged in
// COORDINATION.md rather than decided here. What this DTO *does* close: the
// mass-assignment gap (no DTO at all before this) and the money/date holes.
export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}

// PATCH: every Create field optional, plus status (not part of create — the
// service always creates as PENDING). Unlike CreateAccidentDto's PartialType
// pattern, `status` isn't a Create field, so it's added here directly.
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {
  @IsOptional()
  @IsIn([...EXPENSE_STATUSES], {
    message: `status must be one of ${EXPENSE_STATUSES.join(', ')}`,
  })
  status?: string;
}
