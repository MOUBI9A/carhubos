// PostgreSQL JSONB does not preserve object-key order. Report digests therefore
// use recursively sorted keys, while preserving array/evidence order.
// Physical telemetry is normalized to 12 significant digits (well beyond PID
// sensor resolution) to avoid JSONB/Prisma float serialization drift. Money
// remains exact Decimal strings and is never rounded by this function.
export function canonicalReportJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (typeof entry === 'number') return Number(entry.toPrecision(12));
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry !== null && typeof entry === 'object')
      return Object.fromEntries(
        Object.entries(entry)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, item]) => [key, normalize(item)]),
      );
    return entry;
  };
  return JSON.stringify(normalize(value));
}
