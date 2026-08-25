import { describe, expect, it } from "vitest";
import { buildResultsLens, comparePeriods, summarizeCampaignEvents } from "../shared/results";

describe("Results lens", () => {
  it("keeps forecast unavailable without comparable evidence", () => {
    const lens = buildResultsLens({ target: 30, actual: 12, goalType: "bookings", hasComparableEvidence: false });
    expect(lens.targetLabel).toBe("30 bookings");
    expect(lens.actualLabel).toBe("12 recorded");
    expect(lens.forecastLabel).toBe("Not available");
    expect(lens.progress).toBe(40);
  });

  it("does not fabricate a target or actuals", () => {
    const lens = buildResultsLens({ target: undefined, actual: 0, hasComparableEvidence: false });
    expect(lens.targetLabel).toBe("Not set");
    expect(lens.actualLabel).toBe("No actuals yet");
    expect(lens.progress).toBeNull();
    expect(lens.assumptions).toContain("No revenue guarantee");
  });

  it("summarizes only linked campaign events", () => {
    const summary = summarizeCampaignEvents([
      { eventType: "lead", value: 1 },
      { eventType: "booking", value: 1 },
      { eventType: "sale", value: 120 },
      { eventType: "impression", value: null },
    ]);
    expect(summary.performanceEventCount).toBe(4);
    expect(summary.leads).toBe(1);
    expect(summary.bookings).toBe(1);
    expect(summary.sales).toBe(1);
    expect(summary.revenue).toBe(120);
    expect(summary.conversion).toBe(100);
    expect(summary.actual).toBe(122);
  });

  it("keeps unsupported revenue and conversion metrics null", () => {
    const summary = summarizeCampaignEvents([{ eventType: "reach", value: null }]);
    expect(summary.revenue).toBeNull();
    expect(summary.conversion).toBeNull();
  });

  it("reports insufficient history instead of inventing a trend", () => {
    const now = new Date("2026-08-25T00:00:00.000Z");
    const result = comparePeriods([{ eventType: "booking", value: 2, occurredAt: "2026-08-20T00:00:00.000Z" }], now, 30);
    expect(result.trend).toBe("insufficient_history");
    expect(result.changePercent).toBeNull();
  });

  it("compares current and previous evidence windows", () => {
    const now = new Date("2026-08-25T00:00:00.000Z");
    const result = comparePeriods([
      { eventType: "booking", value: 3, occurredAt: "2026-08-20T00:00:00.000Z" },
      { eventType: "booking", value: 2, occurredAt: "2026-07-20T00:00:00.000Z" },
    ], now, 30);
    expect(result.trend).toBe("up");
    expect(result.changePercent).toBe(50);
  });
});
