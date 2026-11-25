import { Controller, Get, INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { requestIdMiddleware } from '../middleware/request-id.middleware';
import { AutomotiveTelemetryInterceptor } from './automotive-telemetry.interceptor';
import { AutomotiveTelemetryService } from './automotive-telemetry.service';
import { httpAccessLog } from './safe-http';

@Controller('parts')
class PartsFixture {
  @Get(':token')
  fail() {
    throw new Error('private-provider-detail');
  }
}

describe('HTTP log privacy', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const fixture = await Test.createTestingModule({ controllers: [PartsFixture] }).compile();
    app = fixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(requestIdMiddleware, httpAccessLog);
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new AutomotiveTelemetryInterceptor(new AutomotiveTelemetryService()));
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  afterEach(() => jest.restoreAllMocks());

  it('keeps the route and status while removing sensitive input from access, error and span logs', async () => {
    const spies = (['log', 'error', 'warn'] as const).map((level) =>
      jest.spyOn(Logger.prototype, level).mockImplementation(),
    );
    const response = await request(app.getHttpServer()).get('/api/parts/private-token?private-query')
      .set('x-request-id', 'private-request-id')
      .set('x-trace-id', 'private-trace-id')
      .expect(500);

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers['x-trace-id']).toMatch(/^[0-9a-f]{32}$/);
    expect(response.body.path).toBe('/api/parts/:token');
    const args = spies.flatMap(spy => spy.mock.calls);
    expect(JSON.stringify(args)).not.toMatch(/private-(?:provider-detail|token|query|request-id|trace-id)/);
    const entries = args.map(([line]) => JSON.parse(line));
    expect(entries.map(e => e.event).sort()).toEqual(['AUTOMOTIVE_HTTP_SPAN_ERROR', 'http_exception', 'http_request']);
    for (const entry of entries) {
      expect(entry.path).toBe('/api/parts/:token');
      expect(entry.statusCode).toBe(500);
    }
  });

  it('normalizes valid decimal trace IDs and preserves a parent sampling decision', async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const server = app.getHttpServer();
    const datadog = await request(server).get('/api/parts/example')
      .set('x-datadog-trace-id', '18446744073709551615').expect(500);
    expect(datadog.headers['x-trace-id']).toBe('0000000000000000ffffffffffffffff');
    const traceId = 'f'.repeat(32);
    const w3c = await request(server).get('/api/parts/example')
      .set('traceparent', `00-${traceId}-${'1'.repeat(16)}-00`).expect(500);
    expect(w3c.headers.traceparent).toMatch(new RegExp(`^00-${traceId}-[a-f0-9]{16}-00$`));
  });

  it('uses a constant label and message for a missing route', async () => {
    const access = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const errors = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const id = '50be0d4a-a0bb-4fe2-ab06-a1202ed1e224';
    const res = await request(app.getHttpServer()).get('/private-unknown?private-query')
      .set('x-request-id', id).expect(404);
    expect(res.headers['x-request-id']).toBe(id);
    expect(res.body).toMatchObject({ requestId: id, path: 'unmatched', statusCode: 404 });
    expect(JSON.stringify([res.body, access.mock.calls, errors.mock.calls])).not.toContain('private-');
  });
});
