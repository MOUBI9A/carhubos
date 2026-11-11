import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  type MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import {
  CreateDiagnosticSessionDto,
  CreateDiagnosticVehicleDto,
  ConfirmDto,
  EstimateDto,
  IngestEventsDto,
  RecordTestDto,
  RevisionDto,
  SimulateDto,
} from './dto/diagnostics.dto';
import { aggregateEvidence, ingestEvents } from './obd/normalizer';
import { emptySessionData } from './obd/telemetry.types';
import type { SessionData } from './obd/telemetry.types';
import { analyzeEvidence } from './rules/diagnostic-rules';
import { simulateScenario } from './simulator/simulator';
import { createTelemetryStream } from './simulator/streaming-simulator';
import { calculateEstimate } from './estimates/estimate-calculator';
import type { DiagnosticReasoningProvider } from './providers/diagnostic-provider';
import { canonicalReportJson } from './reports/report-integrity';
import { DiagnosticReportService } from './reports/diagnostic-report.service';
import { translateCustomerHealth } from './reports/customer-health-translator';

const CAPS = [
  'diagnostics.view',
  'diagnostics.perform',
  'diagnostics.confirm',
  'diagnostics.estimate',
];
type SessionRow = Prisma.DiagnosticSessionGetPayload<{
  include: { vehicle: true };
}>;
@Injectable()
export class DiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly reports: DiagnosticReportService,
    @Inject('DIAGNOSTIC_REASONING_PROVIDER')
    private readonly provider: DiagnosticReasoningProvider,
  ) {}
  private scope(agencyId: string) {
    if (!agencyId)
      throw new ForbiddenException('An agency context is required');
  }
  async access(user: { id: string; agencyId?: string; role: string }) {
    if (user.role === 'ROOT_ADMIN') return { capabilities: CAPS };
    if (!user.agencyId) return { capabilities: [] };
    const membership = await this.prisma.agencyMembership.findUnique({
      where: { userId_agencyId: { userId: user.id, agencyId: user.agencyId } },
    });
    return {
      capabilities: (membership?.capabilities ?? []).filter((c) =>
        CAPS.includes(c),
      ),
    };
  }
  async vehicles(agencyId: string) {
    this.scope(agencyId);
    return this.prisma.diagnosticVehicle.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  async createVehicle(agencyId: string, dto: CreateDiagnosticVehicleDto) {
    this.scope(agencyId);
    await this.entitlements.assertOperating(agencyId);
    if (
      dto.fleetCarId &&
      !(await this.prisma.car.findFirst({
        where: { id: dto.fleetCarId, agencyId },
      }))
    )
      throw new NotFoundException('Car not found');
    try {
      return await this.prisma.diagnosticVehicle.create({
        data: {
          ...dto,
          brand: dto.brand.trim(),
          model: dto.model.trim(),
          agencyId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Fleet car already linked');
      throw error;
    }
  }
  async sessions(agencyId: string) {
    this.scope(agencyId);
    const rows = await this.prisma.diagnosticSession.findMany({
      where: { agencyId },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => this.present(r));
  }
  async createSession(
    agencyId: string,
    actorId: string,
    dto: CreateDiagnosticSessionDto,
  ) {
    this.scope(agencyId);
    await this.entitlements.assertOperating(agencyId);
    if (
      !(await this.prisma.diagnosticVehicle.findFirst({
        where: { id: dto.vehicleId, agencyId },
      }))
    )
      throw new NotFoundException('Vehicle not found');
    return this.present(
      await this.prisma.diagnosticSession.create({
        data: {
          agencyId,
          createdById: actorId,
          vehicleId: dto.vehicleId,
          symptoms: dto.symptoms ?? '',
          data: this.json(emptySessionData()),
        },
        include: { vehicle: true },
      }),
    );
  }
  async session(agencyId: string, id: string) {
    this.scope(agencyId);
    const row = await this.prisma.diagnosticSession.findFirst({
      where: { id, agencyId },
      include: { vehicle: true },
    });
    if (!row) throw new NotFoundException('Diagnostic session not found');
    return this.present(row);
  }
  private present(row: SessionRow) {
    const data = row.data as unknown as SessionData;
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      vehicle: row.vehicle,
      source: row.source,
      status: row.status,
      revision: row.revision,
      symptoms: row.symptoms,
      ...data,
      aggregates: aggregateEvidence(data.events ?? []),
      aiProvider: {
        configured: this.provider.configured,
        name: this.provider.configured ? this.provider.name : 'UNCONFIGURED',
      },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
  private clearAnalysis(data: SessionData) {
    data.analysis = null;
    data.testResults = [];
    data.confirmation = null;
    data.estimate = null;
  }
  private async mutate(
    agencyId: string,
    actorId: string,
    id: string,
    dto: RevisionDto,
    action: string,
    change: (row: SessionRow, data: SessionData) => void,
  ) {
    this.scope(agencyId);
    await this.entitlements.assertOperating(agencyId);
    return this.prisma.$transaction(
      async (tx) => {
        // Both tenant filtering and a row lock are needed: revision checks alone
        // outside a transaction lose evidence under concurrent requests.
        await tx.$queryRaw`SELECT "id" FROM "DiagnosticSession" WHERE "id" = ${id} AND "agencyId" = ${agencyId} FOR UPDATE`;
        const row = await tx.diagnosticSession.findFirst({
          where: { id, agencyId },
          include: { vehicle: true },
        });
        if (!row) throw new NotFoundException('Diagnostic session not found');
        if (row.revision !== dto.expectedRevision)
          throw new ConflictException({
            message: 'Session changed; refresh and retry',
            revision: row.revision,
          });
        if (row.status === 'REPORTED')
          throw new ConflictException(
            'Reported session is immutable; create a new session for new evidence',
          );
        const data = row.data as unknown as SessionData;
        const before = JSON.stringify({
          data,
          source: row.source,
          status: row.status,
        });
        change(row, data);
        if (
          before ===
          JSON.stringify({ data, source: row.source, status: row.status })
        )
          return this.present(row);
        const updated = await tx.diagnosticSession.update({
          where: { id },
          data: {
            data: this.json(data),
            source: row.source,
            status: row.status,
            revision: { increment: 1 },
          },
          include: { vehicle: true },
        });
        await tx.auditLog.create({
          data: {
            agencyId,
            actorId,
            action,
            entityType: 'DiagnosticSession',
            entityId: id,
            afterState: JSON.stringify({
              revision: updated.revision,
              status: updated.status,
              source: updated.source,
            }),
          },
        });
        return this.present(updated);
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }
  simulate(agencyId: string, actorId: string, id: string, dto: SimulateDto) {
    return this.mutate(
      agencyId,
      actorId,
      id,
      dto,
      'DIAGNOSTIC_SIMULATE',
      (row, data) => {
        if (data.events.length || data.dtcs.length)
          throw new ConflictException(
            'Simulator requires an empty session to keep provenance separate',
          );
        const now = new Date();
        const simulation = simulateScenario(
          dto.scenario,
          dto.seed ?? 1,
          new Date(now.getTime() - 12000),
        );
        // Malformed scenario is deliberately rejected atomically by the same decoder.
        data.events = ingestEvents([], simulation.events, now);
        data.dtcs = simulation.dtcs;
        data.connectionEvents = simulation.connectionEvents;
        this.clearAnalysis(data);
        row.source = 'SIMULATOR';
        row.status = 'OPEN';
      },
    );
  }
  ingest(agencyId: string, actorId: string, id: string, dto: IngestEventsDto) {
    return this.mutate(
      agencyId,
      actorId,
      id,
      dto,
      'DIAGNOSTIC_INGEST',
      (row, data) => {
        if (row.source === 'SIMULATOR')
          throw new ConflictException(
            'Do not mix imported data with simulated evidence',
          );
        const events = ingestEvents(data.events, dto.events);
        const dtcs = [...data.dtcs];
        for (const dtc of dto.dtcs ?? []) {
          const previous = dtcs.find(
            (d) => d.code === dtc.code && d.status === dtc.status,
          );
          if (
            dtc.freezeFrame &&
            (Object.keys(dtc.freezeFrame).length > 20 ||
              Object.entries(dtc.freezeFrame).some(
                ([key, value]) =>
                  ![
                    'rpm',
                    'speed',
                    'coolantTemperature',
                    'shortTermFuelTrim',
                    'longTermFuelTrim',
                    'maf',
                    'map',
                    'throttlePosition',
                    'engineLoad',
                    'oxygenSensorVoltage',
                    'controlModuleVoltage',
                  ].includes(key) ||
                  typeof value !== 'number' ||
                  !Number.isFinite(value) ||
                  Math.abs(value) > 65535,
              ))
          )
            throw new BadRequestException(
              'Invalid captured freeze-frame readings',
            );
          if (!previous)
            dtcs.push({
              ...dtc,
              freezeFrame: dtc.freezeFrame ?? {},
              freezeFrameSource: dtc.freezeFrame ? 'CAPTURED' : 'UNAVAILABLE',
            });
        }
        if (dtcs.length > 30)
          throw new BadRequestException('At most 30 DTC records per session');
        if (
          events.length === data.events.length &&
          dtcs.length === data.dtcs.length
        )
          return;
        data.events = events;
        data.dtcs = dtcs;
        this.clearAnalysis(data);
        row.status = 'OPEN';
      },
    );
  }
  analyze(agencyId: string, actorId: string, id: string, dto: RevisionDto) {
    return this.mutate(
      agencyId,
      actorId,
      id,
      dto,
      'DIAGNOSTIC_ANALYZE',
      (row, data) => {
        if (!data.events.length && !data.dtcs.length)
          throw new BadRequestException(
            'Capture telemetry or DTC evidence before analyzing',
          );
        data.analysis = analyzeEvidence(
          data.events,
          data.dtcs,
          row.source as 'SIMULATOR' | 'IMPORT',
          row.revision + 1,
        );
        data.testResults = [];
        data.confirmation = null;
        data.estimate = null;
        row.status = 'ANALYZED';
      },
    );
  }
  async explain(
    agencyId: string,
    actorId: string,
    id: string,
    dto: RevisionDto,
  ) {
    const snapshot = await this.session(agencyId, id);
    if (snapshot.revision !== dto.expectedRevision)
      throw new ConflictException('Session changed; refresh and retry');
    if (snapshot.status === 'REPORTED')
      throw new ConflictException('Reported session is immutable');
    if (!snapshot.analysis)
      throw new BadRequestException(
        'Analyze before requesting an optional explanation',
      );
    await this.entitlements.assertOperating(agencyId);
    let explanation: NonNullable<SessionData['analysis']>['aiExplanation'] = {
      status: 'UNCONFIGURED',
      provider: 'UNCONFIGURED',
    };
    if (this.provider.configured) {
      try {
        explanation = {
          status: 'AVAILABLE',
          provider: this.provider.name,
          ...(await this.provider.explain(snapshot.analysis)),
        };
      } catch {
        explanation = { status: 'UNAVAILABLE', provider: this.provider.name };
      }
    }
    // The network call holds no database lock. A concurrent evidence edit makes
    // this optimistic write fail rather than attaching prose to stale evidence.
    return this.mutate(
      agencyId,
      actorId,
      id,
      dto,
      'DIAGNOSTIC_EXPLANATION',
      (_row, data) => {
        if (!data.analysis) throw new ConflictException('Analysis changed');
        data.analysis.aiExplanation = explanation;
      },
    );
  }
  recordTest(
    agencyId: string,
    actorId: string,
    id: string,
    dto: RecordTestDto,
  ) {
    return this.mutate(
      agencyId,
      actorId,
      id,
      dto,
      'DIAGNOSTIC_TEST',
      (row, data) => {
        if (!data.analysis)
          throw new BadRequestException(
            'Analyze before recording diagnostic tests',
          );
        const tests = data.analysis.findings.flatMap((f) => f.recommendedTests);
        if (!tests.some((t) => t.id === dto.testId))
          throw new BadRequestException(
            'Test does not belong to current analysis',
          );
        data.testResults = data.testResults.filter(
          (t) => t.testId !== dto.testId,
        );
        data.testResults.push({
          testId: dto.testId,
          result: dto.result,
          notes: dto.notes.trim(),
          actorId,
          recordedAt: new Date().toISOString(),
        });
        data.confirmation = null;
        data.estimate = null;
        row.status = 'ANALYZED';
      },
    );
  }
  confirm(agencyId: string, actorId: string, id: string, dto: ConfirmDto) {
    return this.mutate(
      agencyId,
      actorId,
      id,
      dto,
      'DIAGNOSTIC_CONFIRM',
      (row, data) => {
        if (!data.analysis)
          throw new BadRequestException(
            'Analyze before technician confirmation',
          );
        const selected = data.analysis.findings.filter((f) =>
          dto.findingIds.includes(f.id),
        );
        if (
          !selected.length ||
          new Set(dto.findingIds).size !== dto.findingIds.length ||
          selected.length !== dto.findingIds.length
        )
          throw new BadRequestException('Select valid current findings');
        if (
          data.analysis.findings.some(
            (f) => f.severity === 'URGENT' && !dto.findingIds.includes(f.id),
          )
        )
          throw new BadRequestException('Urgent findings must be addressed');
        for (const test of selected.flatMap((f) => f.recommendedTests)) {
          if (
            !data.testResults.some(
              (t) => t.testId === test.id && t.result !== 'INCONCLUSIVE',
            )
          )
            throw new BadRequestException(
              `Record a conclusive test result for ${test.id} before confirmation`,
            );
        }
        data.confirmation = {
          findingIds: [...dto.findingIds],
          notes: dto.notes.trim(),
          actorId,
          confirmedAt: new Date().toISOString(),
          analysisRevision: data.analysis.analyzedRevision,
        };
        data.estimate = null;
        row.status = 'CONFIRMED';
      },
    );
  }
  estimate(agencyId: string, actorId: string, id: string, dto: EstimateDto) {
    return this.mutate(
      agencyId,
      actorId,
      id,
      dto,
      'DIAGNOSTIC_ESTIMATE',
      (row, data) => {
        if (!data.confirmation)
          throw new BadRequestException(
            'Technician confirmation required before repair estimate',
          );
        data.estimate = calculateEstimate(dto.items, dto.vatRate);
        row.status = 'CONFIRMED';
      },
    );
  }
  report(agencyId: string, actorId: string, id: string, dto: RevisionDto) {
    return this.mutate(
      agencyId,
      actorId,
      id,
      dto,
      'DIAGNOSTIC_REPORT',
      (row, data) => {
        if (!data.confirmation || !data.estimate || !data.analysis)
          throw new BadRequestException(
            'Confirmed analysis and a manual estimate are required',
          );
        const snapshot = {
          contentHashAlgorithm: 'SHA256_CANONICAL_JSON_V1',
          reportId: randomUUID(),
          sessionId: id,
          revision: row.revision + 1,
          createdAt: new Date().toISOString(),
          createdById: actorId,
          source: row.source,
          provenance:
            row.source === 'SIMULATOR'
              ? 'SIMULATED DATA — demonstration only, not a real vehicle diagnosis'
              : 'Imported OBD evidence — hardware authenticity not independently verified',
          vehicle: {
            brand: row.vehicle.brand,
            model: row.vehicle.model,
            year: row.vehicle.year,
            vin: row.vehicle.vin,
          },
          symptoms: row.symptoms,
          dtcs: data.dtcs,
          aggregates: aggregateEvidence(data.events),
          sampleCount: data.events.length,
          excludedSampleCount: data.events.filter(
            (e) => e.quality !== 'ACCEPTED',
          ).length,
          analysis: data.analysis,
          testResults: data.testResults,
          confirmation: data.confirmation,
          estimate: data.estimate,
          limitations: [
            'Technician assessment is required; this report is not a guarantee of vehicle safety.',
            'No OEM, supplier, parts-fitment or labor-time provider was used.',
          ],
        };
        const normalizedSnapshot = JSON.parse(
          canonicalReportJson(snapshot),
        ) as Record<string, unknown>;
        const contentHash = createHash('sha256')
          .update(canonicalReportJson(normalizedSnapshot))
          .digest('hex');
        data.report = { ...normalizedSnapshot, contentHash };
        row.status = 'REPORTED';
      },
    );
  }
  async getReport(agencyId: string, id: string) {
    const session = await this.session(agencyId, id);
    if (!session.report) throw new NotFoundException('Report not generated');
    return session.report;
  }
  async pdf(agencyId: string, id: string) {
    return this.reports.pdf(await this.getReport(agencyId, id));
  }
  async getCustomerHealth(agencyId: string, id: string) {
    const s = await this.session(agencyId, id);
    return translateCustomerHealth(s);
  }
  streamSessionTelemetry(
    agencyId: string,
    id: string,
    scenario = 'p0301',
    seed = 1,
  ): Observable<MessageEvent> {
    this.scope(agencyId);
    return createTelemetryStream(scenario, seed, 80).pipe(
      map(
        (msg) =>
          ({
            data: msg,
          }),
      ),
    );
  }
}
