import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Res,
  Sse,
  UseGuards,
  type MessageEvent,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { DiagnosticsService } from './diagnostics.service';
import { AutomotiveKnowledgeService } from './knowledge/automotive-knowledge.service';
import {
  CopilotGuideDto,
  CreateDiagnosticSessionDto,
  CreateDiagnosticVehicleDto,
  ConfirmDto,
  EstimateDto,
  IngestEventsDto,
  RecordTestDto,
  RevisionDto,
  SimulateDto,
} from './dto/diagnostics.dto';
import { SCENARIOS } from './simulator/scenarios';
type Actor = { id: string; agencyId: string; role: string };
@Controller('diagnostics')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class DiagnosticsController {
  constructor(
    private readonly service: DiagnosticsService,
    private readonly knowledgeService: AutomotiveKnowledgeService,
  ) {}
  @Get('access') access(@CurrentUser() user: Actor) {
    return this.service.access(user);
  }
  @Get('scenarios') @RequireCapabilities('diagnostics.view') scenarios() {
    return SCENARIOS;
  }
  @Get('knowledge/search')
  @RequireCapabilities('diagnostics.view')
  searchKnowledge(
    @Query('query') query?: string,
    @Query('system') system?: string,
  ) {
    return this.knowledgeService.search(query, system as any);
  }
  @Get('knowledge/system/:system')
  @RequireCapabilities('diagnostics.view')
  knowledgeBySystem(@Param('system') system: string) {
    return this.knowledgeService.listBySystem(system as any);
  }
  @Get('knowledge/dtc/:code')
  @RequireCapabilities('diagnostics.view')
  dtcKnowledge(@Param('code') code: string) {
    const entry = this.knowledgeService.getByCode(code);
    if (!entry) {
      throw new NotFoundException(`DTC ${code} not found in knowledge base`);
    }
    return entry;
  }
  @Post('knowledge/copilot')
  @RequireCapabilities('diagnostics.view')
  copilotGuide(@Body() dto: CopilotGuideDto) {
    return this.knowledgeService.generateCopilotGuide(dto.dtcCodes);
  }

  @Get('vehicles') @RequireCapabilities('diagnostics.view') vehicles(
    @CurrentUser() u: Actor,
  ) {
    return this.service.vehicles(u.agencyId);
  }
  @Post('vehicles') @RequireCapabilities('diagnostics.perform') vehicle(
    @CurrentUser() u: Actor,
    @Body() dto: CreateDiagnosticVehicleDto,
  ) {
    return this.service.createVehicle(u.agencyId, dto);
  }
  @Get('sessions') @RequireCapabilities('diagnostics.view') sessions(
    @CurrentUser() u: Actor,
  ) {
    return this.service.sessions(u.agencyId);
  }
  @Post('sessions') @RequireCapabilities('diagnostics.perform') create(
    @CurrentUser() u: Actor,
    @Body() dto: CreateDiagnosticSessionDto,
  ) {
    return this.service.createSession(u.agencyId, u.id, dto);
  }
  @Get('sessions/:id') @RequireCapabilities('diagnostics.view') session(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
  ) {
    return this.service.session(u.agencyId, id);
  }
  @Post('sessions/:id/simulate')
  @RequireCapabilities('diagnostics.perform')
  simulate(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
    @Body() dto: SimulateDto,
  ) {
    return this.service.simulate(u.agencyId, u.id, id, dto);
  }
  @Post('sessions/:id/events')
  @RequireCapabilities('diagnostics.perform')
  ingest(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
    @Body() dto: IngestEventsDto,
  ) {
    return this.service.ingest(u.agencyId, u.id, id, dto);
  }
  @Post('sessions/:id/analyze')
  @RequireCapabilities('diagnostics.perform')
  analyze(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
    @Body() dto: RevisionDto,
  ) {
    return this.service.analyze(u.agencyId, u.id, id, dto);
  }
  @Post('sessions/:id/explain')
  @RequireCapabilities('diagnostics.perform')
  explain(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
    @Body() dto: RevisionDto,
  ) {
    return this.service.explain(u.agencyId, u.id, id, dto);
  }
  @Post('sessions/:id/tests') @RequireCapabilities('diagnostics.perform') test(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
    @Body() dto: RecordTestDto,
  ) {
    return this.service.recordTest(u.agencyId, u.id, id, dto);
  }
  @Post('sessions/:id/confirm')
  @RequireCapabilities('diagnostics.confirm')
  confirm(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
    @Body() dto: ConfirmDto,
  ) {
    return this.service.confirm(u.agencyId, u.id, id, dto);
  }
  @Put('sessions/:id/estimate')
  @RequireCapabilities('diagnostics.estimate')
  estimate(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
    @Body() dto: EstimateDto,
  ) {
    return this.service.estimate(u.agencyId, u.id, id, dto);
  }
  @Post('sessions/:id/report')
  @RequireCapabilities('diagnostics.confirm')
  report(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
    @Body() dto: RevisionDto,
  ) {
    return this.service.report(u.agencyId, u.id, id, dto);
  }
  @Get('sessions/:id/report')
  @RequireCapabilities('diagnostics.view')
  getReport(@CurrentUser() u: Actor, @Param('id') id: string) {
    return this.service.getReport(u.agencyId, id);
  }
  @Get('sessions/:id/report.pdf')
  @RequireCapabilities('diagnostics.view')
  async pdf(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const buffer = await this.service.pdf(u.agencyId, id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="diagnostic-report.pdf"',
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(buffer);
  }
  @Get('sessions/:id/health-summary')
  @RequireCapabilities('diagnostics.view')
  healthSummary(@CurrentUser() u: Actor, @Param('id') id: string) {
    return this.service.getCustomerHealth(u.agencyId, id);
  }
  @Sse('sessions/:id/stream')
  @RequireCapabilities('diagnostics.perform')
  stream(
    @CurrentUser() u: Actor,
    @Param('id') id: string,
    @Query('scenario') scenario?: string,
    @Query('seed') seed?: string,
  ): Observable<MessageEvent> {
    return this.service.streamSessionTelemetry(
      u.agencyId,
      id,
      scenario ?? 'p0301',
      seed ? Number(seed) : 1,
    );
  }
}
