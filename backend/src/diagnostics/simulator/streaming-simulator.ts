import { Observable } from 'rxjs';
import { simulateScenario } from './simulator';
import { decodeObd } from '../obd/obd-decoder';
import type { DtcEvidence, ObdEvent, Observation } from '../obd/telemetry.types';

export interface TelemetryStreamMessage {
  type: 'telemetry' | 'dtc' | 'connection' | 'complete';
  payload: {
    event?: ObdEvent & { observation: Observation };
    dtcs?: DtcEvidence[];
    connectionEvent?: { type: string; at: string };
    summary?: { totalEvents: number; dtcCount: number };
  };
}

export function createTelemetryStream(
  scenario: string,
  seed = 1,
  intervalMs = 80,
): Observable<TelemetryStreamMessage> {
  return new Observable<TelemetryStreamMessage>((subscriber) => {
    const { events, dtcs, connectionEvents } = simulateScenario(scenario, seed);
    let index = 0;
    let dtcSent = false;

    // Send connection event first
    if (connectionEvents.length > 0) {
      subscriber.next({
        type: 'connection',
        payload: { connectionEvent: connectionEvents[0] },
      });
    }

    const timer = setInterval(() => {
      if (subscriber.closed) {
        clearInterval(timer);
        return;
      }

      // Halfway through stream, push DTC event if present in scenario
      if (!dtcSent && index >= Math.floor(events.length / 2)) {
        if (dtcs.length > 0) {
          subscriber.next({
            type: 'dtc',
            payload: { dtcs },
          });
        }
        dtcSent = true;
      }

      if (index < events.length) {
        const rawEvent = events[index];
        try {
          const observation = decodeObd(rawEvent);
          subscriber.next({
            type: 'telemetry',
            payload: {
              event: { ...rawEvent, observation },
            },
          });
        } catch {
          // If a packet cannot be decoded in mode 01, emit raw event
          subscriber.next({
            type: 'telemetry',
            payload: {
              event: {
                ...rawEvent,
                observation: {
                  metric: `PID 0x${rawEvent.pid.toString(16)}`,
                  value: 0,
                  unit: '',
                },
              },
            },
          });
        }
        index++;
      } else {
        clearInterval(timer);
        subscriber.next({
          type: 'complete',
          payload: {
            summary: {
              totalEvents: events.length,
              dtcCount: dtcs.length,
            },
          },
        });
        subscriber.complete();
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  });
}
