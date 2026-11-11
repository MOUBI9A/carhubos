import { createTelemetryStream } from './streaming-simulator';
import { take, toArray } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

describe('createTelemetryStream', () => {
  it('streams connection and telemetry packets with decoded OBD observations', async () => {
    const stream$ = createTelemetryStream('p0301', 1, 10);
    const messages = await firstValueFrom(stream$.pipe(take(10), toArray()));

    expect(messages.length).toBe(10);
    const telemetryMsgs = messages.filter((m) => m.type === 'telemetry');
    expect(telemetryMsgs.length).toBeGreaterThan(0);

    const first = telemetryMsgs[0];
    expect(first.payload.event).toBeDefined();
    expect(first.payload.event?.observation).toBeDefined();
    expect(first.payload.event?.observation?.metric).toBeDefined();
  });

  it('emits DTC detection halfway through when fault scenario runs', async () => {
    const stream$ = createTelemetryStream('p0301', 1, 5);
    const messages = await firstValueFrom(stream$.pipe(toArray()));

    const dtcMsg = messages.find((m) => m.type === 'dtc');
    expect(dtcMsg).toBeDefined();
    expect(dtcMsg?.payload.dtcs).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'P0301' })]),
    );

    const completeMsg = messages.find((m) => m.type === 'complete');
    expect(completeMsg).toBeDefined();
    expect(completeMsg?.payload.summary?.totalEvents).toBeGreaterThan(0);
  });
});
