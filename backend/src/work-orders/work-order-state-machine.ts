import { BadRequestException } from '@nestjs/common';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_PARTS'
  | 'BLOCKED'
  | 'READY_FOR_QUALITY_CHECK'
  | 'QUALITY_CHECK'
  | 'COMPLETED'
  | 'INVOICED'
  | 'CANCELLED';

export const VALID_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'DRAFT',
  'AWAITING_APPROVAL',
  'APPROVED',
  'SCHEDULED',
  'IN_PROGRESS',
  'WAITING_FOR_PARTS',
  'BLOCKED',
  'READY_FOR_QUALITY_CHECK',
  'QUALITY_CHECK',
  'COMPLETED',
  'INVOICED',
  'CANCELLED',
];

export const WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  DRAFT: ['AWAITING_APPROVAL', 'APPROVED', 'CANCELLED'],
  AWAITING_APPROVAL: ['APPROVED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_PARTS', 'BLOCKED', 'READY_FOR_QUALITY_CHECK', 'CANCELLED'],
  WAITING_FOR_PARTS: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'WAITING_FOR_PARTS', 'CANCELLED'],
  READY_FOR_QUALITY_CHECK: ['QUALITY_CHECK', 'IN_PROGRESS'],
  QUALITY_CHECK: ['COMPLETED', 'IN_PROGRESS'],
  COMPLETED: ['INVOICED'],
  INVOICED: [],
  CANCELLED: [],
};

export function assertValidTransition(
  current: string,
  target: string,
): asserts target is WorkOrderStatus {
  if (!VALID_WORK_ORDER_STATUSES.includes(target as WorkOrderStatus)) {
    throw new BadRequestException(`Unknown work order status: ${target}`);
  }

  const validNext = WORK_ORDER_TRANSITIONS[current as WorkOrderStatus] ?? [];
  if (!validNext.includes(target as WorkOrderStatus)) {
    throw new BadRequestException(
      `Invalid work order transition from ${current} to ${target}. Valid targets: ${
        validNext.length ? validNext.join(', ') : 'none (terminal state)'
      }`,
    );
  }
}
