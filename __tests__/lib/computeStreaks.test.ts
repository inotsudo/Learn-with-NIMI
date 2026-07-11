import { describe, it, expect } from "vitest";
import { computeStreaks } from "@/lib/parentInsights";

const d = (offsetDays: number, from = new Date("2026-06-15")) => {
  const date = new Date(from);
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const TODAY = new Date("2026-06-15T12:00:00");

describe("computeStreaks", () => {
  it("returns zeros for empty set", () => {
    const result = computeStreaks(new Set(), TODAY);
    expect(result).toEqual({ current: 0, activeToday: false, longest: 0 });
  });

  it("detects active today", () => {
    const result = computeStreaks(new Set([d(0)]), TODAY);
    expect(result.activeToday).toBe(true);
    expect(result.current).toBe(1);
  });

  it("does not count as active when only yesterday", () => {
    const result = computeStreaks(new Set([d(-1)]), TODAY);
    expect(result.activeToday).toBe(false);
    expect(result.current).toBe(1);
  });

  it("counts consecutive days backward from today", () => {
    const dates = new Set([d(0), d(-1), d(-2), d(-3)]);
    const result = computeStreaks(dates, TODAY);
    expect(result.current).toBe(4);
    expect(result.activeToday).toBe(true);
  });

  it("streak breaks at a gap", () => {
    const dates = new Set([d(0), d(-1), d(-3)]); // gap at d(-2)
    const result = computeStreaks(dates, TODAY);
    expect(result.current).toBe(2);
  });

  it("calculates longest streak across non-contiguous runs", () => {
    const dates = new Set([
      d(-10), d(-9), d(-8), // 3-day run
      d(-4), d(-3), d(-2), d(-1), d(0), // 5-day run
    ]);
    const result = computeStreaks(dates, TODAY);
    expect(result.longest).toBe(5);
    expect(result.current).toBe(5);
  });

  it("shielded dates extend the streak", () => {
    const activityDates = new Set([d(0), d(-1)]);
    const shieldedDates = new Set([d(-2)]); // shield fills the gap
    const result = computeStreaks(activityDates, TODAY, shieldedDates);
    expect(result.current).toBe(3);
  });

  it("single date set has longest of 1", () => {
    const result = computeStreaks(new Set([d(-5)]), TODAY);
    expect(result.longest).toBe(1);
  });

  it("returns current=0 when gap before yesterday", () => {
    const dates = new Set([d(-5), d(-4)]);
    const result = computeStreaks(dates, TODAY);
    expect(result.current).toBe(0);
    expect(result.activeToday).toBe(false);
  });
});
