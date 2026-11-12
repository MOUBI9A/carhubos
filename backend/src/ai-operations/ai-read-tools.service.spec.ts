import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AiReadToolsService } from './ai-read-tools.service';
import { AiReadToolsController } from './ai-read-tools.controller';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { CAPABILITIES_KEY } from '../common/decorators/require-capabilities.decorator';

const AGENCY = 'tenant-red';
const briefing = {
  sampledAt: '2026-11-12T08:30:00.000Z',
  metrics: {
    vehiclesTotal: 8, vehiclesAvailable: 5, vehiclesMaintenance: 1,
    activeRentals: 2, returnsNext24h: 1, overdueReturns: 0,
    documentsExpiring7d: 2, documentsExpired: 1,
    openInvoices: 3, urgentTasks: 1,
  },
  limitations: ['Unverified payment dates not inferred.'],
};

function setup() {
  const operations = {
    getAgencyBriefing: jest.fn(async (_agencyId: string) => briefing),
    createTask: jest.fn(),
    changeBooking: jest.fn(),
  };
  const service = new AiReadToolsService(operations as never);
  return { service, operations };
}

describe('Phase 1C: read-only tool registry', () => {
  it('exposes only five fixed tools with no arbitrary input or external AI', () => {
    const { service } = setup();
    const tools = service.list();
    expect(tools.map((tool) => tool.id)).toEqual([
      'fleet_overview', 'return_attention', 'document_review',
      'invoice_review', 'urgent_tasks',
    ]);
    expect(tools.every((tool) =>
      tool.mode === 'READ_ONLY' &&
      tool.inputSchema === 'NO_ARGUMENTS' &&
      !tool.usesCustomerPersonalData &&
      !tool.callsExternalModel &&
      !tool.executesActions,
    )).toBe(true);
  });

  it('previews typed metrics for the session agency and nothing personal', async () => {
    const { service, operations } = setup();
    const output = await service.preview(AGENCY, 'invoice_review');
    expect(operations.getAgencyBriefing).toHaveBeenCalledWith(AGENCY);
    expect(output).toMatchObject({
      id: 'invoice_review',
      mode: 'READ_ONLY',
      source: 'Invoice',
      externalAiUsed: false,
      automatedActionsEnabled: false,
      metrics: { openInvoices: 3 },
    });
    expect(Object.keys(output.metrics)).toEqual(['openInvoices']);
    expect(JSON.stringify(output)).not.toContain('email');
    expect(operations.createTask).not.toHaveBeenCalled();
    expect(operations.changeBooking).not.toHaveBeenCalled();
  });

  it('rejects missing tenants, unknown tool names and injection before queries', async () => {
    const { service, operations } = setup();
    await expect(service.preview('', 'fleet_overview')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.preview(AGENCY, 'arbitrary/sql')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.preview(AGENCY, '__proto__')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.preview(AGENCY, 'constructor')).rejects.toBeInstanceOf(BadRequestException);
    expect(operations.getAgencyBriefing).not.toHaveBeenCalled();
  });

  it('controller never takes agencyId from the URL or from caller-supplied tool parameters', async () => {
    const { service, operations } = setup();
    const controller = new AiReadToolsController(service);
    await controller.preview({ agencyId: AGENCY }, 'fleet_overview');
    expect(operations.getAgencyBriefing).toHaveBeenCalledWith(AGENCY);
    await expect(controller.preview({}, 'fleet_overview')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires owner/manager with both finance and reporting capabilities', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AiReadToolsController)).toEqual(['OWNER', 'MANAGER']);
    expect(Reflect.getMetadata(CAPABILITIES_KEY, AiReadToolsController))
      .toEqual(['reports.view', 'finance.view']);
  });
});
