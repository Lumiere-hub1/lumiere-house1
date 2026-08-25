import { describe, expect, it } from "vitest";
import { isWithinQuietHours, parsePerformanceCsv } from "../server/validation";

describe("performance import validation", () => {
  it("accepts valid rows and records validation evidence for invalid rows", () => {
    const rows = parsePerformanceCsv([
      "eventType,value,occurredAt,metadata",
      "booking,3,2026-08-24T12:00:00.000Z,source=crm",
      "lead,-1,not-a-date,invalid",
    ].join("\n"));
    expect(rows).toHaveLength(2);
    expect(rows[0].validationError).toBeUndefined();
    expect(rows[1].validationError).toContain("value must be a non-negative integer");
    expect(rows[1].validationError).toContain("occurredAt must be an ISO date");
  });
});

describe("schedule quiet-hour validation", () => {
  it("supports both regular and cross-midnight quiet windows", () => {
    expect(isWithinQuietHours({ start: "09:00", end: "17:00" }, new Date("2026-08-24T12:00:00Z"))).toBe(true);
    expect(isWithinQuietHours({ start: "09:00", end: "17:00" }, new Date("2026-08-24T18:00:00Z"))).toBe(false);
    expect(isWithinQuietHours({ start: "22:00", end: "06:00" }, new Date("2026-08-24T23:00:00Z"))).toBe(true);
    expect(isWithinQuietHours({ start: "22:00", end: "06:00" }, new Date("2026-08-24T12:00:00Z"))).toBe(false);
  });
});
