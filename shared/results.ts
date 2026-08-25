export type ResultsLensInput = {
  target: number | null | undefined;
  actual: number;
  goalType?: string | null;
  hasComparableEvidence: boolean;
};

export function buildResultsLens(input: ResultsLensInput) {
  const target = input.target ?? null;
  const progress = target ? Math.min(100, Math.round((input.actual / Math.max(target, 1)) * 100)) : null;
  return {
    targetLabel: target === null ? "Not set" : `${target}${input.goalType ? ` ${input.goalType}` : ""}`,
    forecastLabel: input.hasComparableEvidence ? "Evidence required" : "Not available",
    actualLabel: target === null && input.actual === 0 ? "No actuals yet" : `${input.actual} recorded`,
    progress,
    assumptions: "Targets are user-entered; forecasts remain unavailable until enough comparable performance evidence exists. No revenue guarantee is inferred.",
  } as const;
}

export type CampaignEvent = { eventType: string; value: number | null; occurredAt?: Date | string };

export function comparePeriods(events: CampaignEvent[], now = new Date(), periodDays = 30) {
  const periodMs = periodDays * 24 * 60 * 60 * 1000;
  const currentStart = now.getTime() - periodMs;
  const previousStart = currentStart - periodMs;
  const current = events.filter((event) => event.occurredAt && new Date(event.occurredAt).getTime() >= currentStart && new Date(event.occurredAt).getTime() <= now.getTime());
  const previous = events.filter((event) => event.occurredAt && new Date(event.occurredAt).getTime() >= previousStart && new Date(event.occurredAt).getTime() < currentStart);
  const sum = (items: CampaignEvent[]) => items.reduce((total, event) => total + (event.value ?? 0), 0);
  const currentValue = sum(current);
  const previousValue = sum(previous);
  if (!current.length && !previous.length) return { currentCount: 0, previousCount: 0, currentValue: 0, previousValue: 0, changePercent: null, trend: "no_data" as const };
  if (!previous.length) return { currentCount: current.length, previousCount: 0, currentValue, previousValue, changePercent: null, trend: "insufficient_history" as const };
  const baseline = previousValue || previous.length;
  const numerator = (currentValue || current.length) - baseline;
  return { currentCount: current.length, previousCount: previous.length, currentValue, previousValue, changePercent: Math.round((numerator / baseline) * 10000) / 100, trend: numerator > 0 ? "up" as const : numerator < 0 ? "down" as const : "flat" as const };
}

export function summarizeCampaignEvents(events: CampaignEvent[]) {
  const metric = (names: string[]) => events.filter((event) => names.includes(event.eventType.toLowerCase()));
  const leads = metric(["lead", "leads"]);
  const bookings = metric(["booking", "bookings"]);
  const sales = metric(["sale", "sales"]);
  const revenueEvents = metric(["revenue", "sale", "sales"]);
  return {
    performanceEventCount: events.length,
    leads: leads.length || null,
    bookings: bookings.length || null,
    sales: sales.length || null,
    revenue: revenueEvents.some((event) => event.value !== null) ? revenueEvents.reduce((sum, event) => sum + (event.value ?? 0), 0) : null,
    conversion: leads.length ? Math.round((bookings.length / leads.length) * 10000) / 100 : null,
    actual: events.reduce((sum, event) => sum + (event.value ?? 0), 0),
  } as const;
}
