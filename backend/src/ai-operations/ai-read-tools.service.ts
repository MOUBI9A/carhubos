import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AiOperationsService } from './ai-operations.service';

/**
 * Fixed, read-only tool allowlist. Model integrations must never get direct SQL
 * access, arbitrary tool names/arguments or tenant IDs from prompts.
 */
const READ_TOOLS = {
  fleet_overview: {
    description: 'Agency vehicle totals, available cars, and maintenance status',
    source: 'Car',
    fields: ['vehiclesTotal', 'vehiclesAvailable', 'vehiclesMaintenance'],
  },
  return_attention: {
    description: 'Active bookings returning soon or marked late',
    source: 'Booking',
    fields: ['activeRentals', 'returnsNext24h', 'overdueReturns'],
  },
  document_review: {
    description: 'Vehicle documents expiring or already expired',
    source: 'CarDocument',
    fields: ['documentsExpiring7d', 'documentsExpired'],
  },
  invoice_review: {
    description: 'Invoices marked DUE/PARTIAL; not verified overdue or paid',
    source: 'Invoice',
    fields: ['openInvoices'],
  },
  urgent_tasks: {
    description: 'Urgent pending or in-progress staff tasks',
    source: 'Task',
    fields: ['urgentTasks'],
  },
} as const;

type ReadToolId = keyof typeof READ_TOOLS;
const readToolIds = Object.keys(READ_TOOLS) as ReadToolId[];

@Injectable()
export class AiReadToolsService {
  constructor(private readonly operations: AiOperationsService) {}

  list() {
    return readToolIds.map((id) => ({
      id,
      description: READ_TOOLS[id].description,
      source: READ_TOOLS[id].source,
      mode: 'READ_ONLY' as const,
      inputSchema: 'NO_ARGUMENTS' as const,
      usesCustomerPersonalData: false as const,
      callsExternalModel: false as const,
      executesActions: false as const,
    }));
  }

  async preview(agencyId: string, toolId: string) {
    if (!agencyId?.trim()) throw new ForbiddenException('Agency membership required.');
    if (!Object.prototype.hasOwnProperty.call(READ_TOOLS, toolId)) {
      // Never interpret unknown tool names as SQL, URLs or dynamic methods.
      throw new BadRequestException('This read-only tool is not allowed.');
    }
    const id = toolId as ReadToolId;
    const briefing = await this.operations.getAgencyBriefing(agencyId);
    const selected: Record<string, number> = {};
    for (const key of READ_TOOLS[id].fields) {
      selected[key] = briefing.metrics[key];
    }
    return {
      id,
      sampledAt: briefing.sampledAt,
      source: READ_TOOLS[id].source,
      mode: 'READ_ONLY' as const,
      analysisType: 'DETERMINISTIC_AGENCY_RECORDS' as const,
      externalAiUsed: false as const,
      automatedActionsEnabled: false as const,
      metrics: selected,
      limitations: briefing.limitations,
    };
  }
}
