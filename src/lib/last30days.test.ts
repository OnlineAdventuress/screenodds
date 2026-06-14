import { describe, expect, it } from "vitest";
import {
  filterToTrailingWindow,
  getRecencyMetrics,
  normalizePublishedAt,
} from "./last30days";

describe("last30days helpers", () => {
  const now = new Date("2026-06-14T12:00:00.000Z");

  it("normalizes timestamps and drops items outside the trailing window", () => {
    const items = [
      { id: "fresh", publishedAt: "2026-06-14T00:00:00.000Z" },
      { id: "boundary", publishedAt: "2026-05-15T12:00:00.000Z" },
      { id: "old", publishedAt: "2026-05-14T11:59:59.000Z" },
      { id: "invalid", publishedAt: "not-a-date" },
    ];

    const filtered = filterToTrailingWindow(items, (item) => item.publishedAt, {
      now,
      trailingDays: 30,
    });

    expect(filtered.map((item) => item.id)).toEqual(["fresh", "boundary"]);
    expect(normalizePublishedAt("not-a-date")).toBeNull();
  });

  it("exposes age and decay values for later weighting", () => {
    const fresh = getRecencyMetrics("2026-06-13T12:00:00.000Z", {
      now,
      halfLifeDays: 14,
    });
    const older = getRecencyMetrics("2026-05-31T12:00:00.000Z", {
      now,
      halfLifeDays: 14,
    });

    expect(fresh?.ageDays).toBeCloseTo(1, 4);
    expect(older?.ageDays).toBeCloseTo(14, 4);
    expect(fresh?.decay).toBeGreaterThan(older?.decay ?? 0);
    expect(older?.decay).toBeCloseTo(0.5, 2);
  });
});
