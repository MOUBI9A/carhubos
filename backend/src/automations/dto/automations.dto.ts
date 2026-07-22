import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

/**
 * Trigger/action vocabulary for AutomationRule. Stored as String on the schema;
 * DTO-constrained per CLAUDE.md §6 (constrain enum-like strings with @IsIn).
 * These mirror the live "New automation rule" form
 * (frontend/src/app/(owner)/dashboard/automations/page.tsx) exactly, so both
 * sides share one source of truth — the frontend should import these rather than
 * re-list them.
 *
 * NOTE: creating a rule PERSISTS a definition; the scheduler does not yet execute
 * user rules (the cron handlers in automations.service.ts are still hardcoded and
 * do not consult these rows). Wiring execution is a tracked follow-up.
 */
export const AUTOMATION_TRIGGERS = [
  'BOOKING_CREATED',
  'BOOKING_COMPLETED',
  'DOCUMENT_EXPIRING_7D',
  'DOCUMENT_EXPIRING_30D',
  'VEHICLE_RETURNED',
  'RETURN_OVERDUE_2H',
  'MILEAGE_THRESHOLD',
  'HIGH_DEMAND_DETECTED',
] as const;

export const AUTOMATION_ACTIONS = [
  'SEND_WHATSAPP_NUDGE',
  'CREATE_MAINTENANCE_TASK',
  'GENERATE_INVOICE',
  'NOTIFY_OWNER',
  'HARD_LOCK_ASSET',
  'SEND_EMAIL',
] as const;

export class CreateAutomationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsIn([...AUTOMATION_TRIGGERS], {
    message: `trigger must be one of ${AUTOMATION_TRIGGERS.join(', ')}`,
  })
  trigger: string;

  @IsString()
  @IsIn([...AUTOMATION_ACTIONS], {
    message: `action must be one of ${AUTOMATION_ACTIONS.join(', ')}`,
  })
  action: string;

  // Optional JSON config blob (thresholds, message templates, …). Stored verbatim
  // as a string; bounded so a rule row can't be used to stuff arbitrary payload.
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  config?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// PATCH: every field optional; trigger/action stay @IsIn-constrained via inheritance.
export class UpdateAutomationDto extends PartialType(CreateAutomationDto) {}
