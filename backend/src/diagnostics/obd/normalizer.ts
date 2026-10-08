import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { decodeObd } from './obd-decoder';
import type { ObdEvent, StoredEvent } from './telemetry.types';
export const MAX_EVENTS = 1000;
export const MAX_BATCH = 250;
export const REORDER_WINDOW_MS = 30_000;
export function ingestEvents(
  existing: StoredEvent[],
  incoming: ObdEvent[],
  now = new Date(),
): StoredEvent[] {
  if (incoming.length > MAX_BATCH)
    throw new BadRequestException(`At most ${MAX_BATCH} events per batch`);
  const events = [...existing];
  const byId = new Map(events.map((e) => [`${e.streamId}:${e.eventId}`, e]));
  for (const event of incoming) {
    if (
      !event.eventId ||
      !event.streamId ||
      !Number.isInteger(event.sequence) ||
      event.sequence < 0 ||
      !Number.isFinite(Date.parse(event.observedAt))
    )
      throw new BadRequestException('Invalid event identity or timestamp');
    const canonical = {
      eventId: event.eventId,
      streamId: event.streamId,
      sequence: event.sequence,
      observedAt: new Date(event.observedAt).toISOString(),
      mode: event.mode,
      pid: event.pid,
      bytes: event.bytes,
    };
    const hash = createHash('sha256')
      .update(JSON.stringify(canonical))
      .digest('hex');
    const key = `${event.streamId}:${event.eventId}`;
    const previous = byId.get(key);
    if (previous) {
      if (previous.hash !== hash)
        throw new ConflictException(
          'Event identifier reused with different payload',
        );
      continue;
    }
    if (events.length >= MAX_EVENTS)
      throw new BadRequestException(
        `Session limit of ${MAX_EVENTS} events reached`,
      );
    const observation = decodeObd(event);
    const observedMs = Date.parse(canonical.observedAt);
    const latest = events
      .filter(
        (e) => e.streamId === event.streamId && e.quality !== 'CLOCK_DRIFT',
      )
      .reduce((ms, e) => Math.max(ms, Date.parse(e.observedAt)), 0);
    const quality =
      observedMs > now.getTime() + 300_000
        ? 'CLOCK_DRIFT'
        : observedMs < latest - REORDER_WINDOW_MS
          ? 'LATE'
          : 'ACCEPTED';
    const stored: StoredEvent = {
      ...canonical,
      hash,
      observation,
      quality,
      receivedAt: now.toISOString(),
    };
    events.push(stored);
    byId.set(key, stored);
  }
  return events;
}
export function aggregateEvidence(
  events: StoredEvent[],
): Record<string, { min: number; max: number; mean: number; count: number }> {
  const groups = new Map<string, number[]>();
  for (const event of events) {
    if (event.quality !== 'ACCEPTED') continue;
    const values = groups.get(event.observation.metric) ?? [];
    values.push(event.observation.value);
    groups.set(event.observation.metric, values);
  }
  return Object.fromEntries(
    [...groups].map(([metric, values]) => [
      metric,
      {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
      },
    ]),
  );
}
