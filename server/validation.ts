export type PerformanceImportRow = {
  eventType: string;
  value?: number;
  occurredAt: Date;
  metadata?: Record<string, string>;
  validationError?: string;
};

export function parsePerformanceCsv(csv: string): PerformanceImportRow[] {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.slice(lines[0]?.toLowerCase().startsWith("eventtype") ? 1 : 0).map((line) => {
    const [eventTypeRaw, valueRaw, occurredAtRaw, metadataRaw] = line.split(",").map((part) => part.trim());
    const eventType = eventTypeRaw || "";
    const parsedDate = occurredAtRaw ? new Date(occurredAtRaw) : new Date(NaN);
    const value = valueRaw === undefined || valueRaw === "" ? undefined : Number(valueRaw);
    const errors: string[] = [];
    if (eventType.length < 2) errors.push("eventType is required");
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) errors.push("value must be a non-negative integer");
    if (Number.isNaN(parsedDate.getTime())) errors.push("occurredAt must be an ISO date");
    return {
      eventType,
      value,
      occurredAt: parsedDate,
      metadata: metadataRaw ? { note: metadataRaw } : undefined,
      validationError: errors.length ? errors.join("; ") : undefined,
    };
  });
}

export function isWithinQuietHours(value: unknown, now = new Date()): boolean {
  if (!value || typeof value !== "object") return false;
  const quiet = value as { start?: unknown; end?: unknown };
  if (typeof quiet.start !== "string" || typeof quiet.end !== "string") return false;
  const [startHour, startMinute] = quiet.start.split(":").map(Number);
  const [endHour, endMinute] = quiet.end.split(":").map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return false;
  const current = now.getUTCHours() * 60 + now.getUTCMinutes();
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return start <= end ? current >= start && current < end : current >= start || current < end;
}
