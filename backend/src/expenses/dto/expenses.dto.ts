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

// `category` is the canonical expense taxonomy (COORDINATION.md finding #10,
// founder decision: "codes + fix the UI"). The schema comment, this `@IsIn`, and
// the live "Record an expense" form (dashboard/finance/page.tsx) now all use
// these codes — the form submits the code via `<option value=>` and shows a
// friendly label, and `getSummary().byCategory` keys on the code. The Expense
// table was empty (0 rows) when this landed, so no legacy prose-category rows
// exist to migrate. Previously category was an unconstrained string (the F3 DTO
// deliberately left it open pending this taxonomy call).
export const EXPENSE_CATEGORIES = [
  'SALARY',
  'RENT',
  'UTILITIES',
  'MARKETING',
  'TAX',
  'MAINTENANCE',
  'OTHER',
] as const;

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([...EXPENSE_CATEGORIES], {
    message: `category must be one of ${EXPENSE_CATEGORIES.join(', ')}`,
  })
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
