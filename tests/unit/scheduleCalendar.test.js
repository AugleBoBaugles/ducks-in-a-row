// tests/unit/scheduleCalendar.test.js
// Unit tests for the ScheduleCalendar utility functions.
// Covers range derivation, offset calculation, and hour label formatting.

import { describe, it, expect } from "vitest";
import {
  computeHourRange,
  timeToOffset,
  formatHour,
} from "../../client/src/utils/scheduleCalendarUtils.js";

// ---------------------------------------------------------------------------
// computeHourRange
// ---------------------------------------------------------------------------

describe("computeHourRange", () => {
  it("falls back to 6–22 when blocks is empty", () => {
    const { startHour, endHour, hours } = computeHourRange([]);
    expect(startHour).toBe(6);
    expect(endHour).toBe(22);
    expect(hours).toHaveLength(17); // 6 through 22 inclusive
    expect(hours[0]).toBe(6);
    expect(hours[hours.length - 1]).toBe(22);
  });

  it("adds a 1-hour buffer before the earliest start", () => {
    const blocks = [{ startTime: "09:00", endTime: "10:00" }];
    const { startHour } = computeHourRange(blocks);
    expect(startHour).toBe(8); // 9 - 1
  });

  it("adds a 1-hour buffer after the latest end (on-the-hour end)", () => {
    const blocks = [{ startTime: "09:00", endTime: "11:00" }];
    const { endHour } = computeHourRange(blocks);
    expect(endHour).toBe(12); // 11 + 1
  });

  it("rounds up a non-zero-minute end time before adding the buffer", () => {
    // endTime 10:30 → ceil to 11 → +1 buffer → 12
    const blocks = [{ startTime: "09:00", endTime: "10:30" }];
    const { endHour } = computeHourRange(blocks);
    expect(endHour).toBe(12);
  });

  it("spans multiple blocks correctly", () => {
    const blocks = [
      { startTime: "08:00", endTime: "09:00" },
      { startTime: "13:00", endTime: "14:30" },
      { startTime: "16:00", endTime: "17:00" },
    ];
    const { startHour, endHour } = computeHourRange(blocks);
    expect(startHour).toBe(7);  // earliest start 8 - 1
    expect(endHour).toBe(18);   // latest end 17 + 1
  });

  it("does not let startHour go below 0", () => {
    const blocks = [{ startTime: "00:00", endTime: "01:00" }];
    const { startHour } = computeHourRange(blocks);
    expect(startHour).toBe(0);
  });

  it("does not let endHour exceed 23", () => {
    const blocks = [{ startTime: "22:00", endTime: "23:00" }];
    const { endHour } = computeHourRange(blocks);
    expect(endHour).toBe(23);
  });

  it("returns a contiguous hours array covering startHour to endHour", () => {
    const blocks = [{ startTime: "10:00", endTime: "12:00" }];
    const { startHour, endHour, hours } = computeHourRange(blocks);
    expect(hours[0]).toBe(startHour);
    expect(hours[hours.length - 1]).toBe(endHour);
    expect(hours).toHaveLength(endHour - startHour + 1);
  });
});

// ---------------------------------------------------------------------------
// timeToOffset
// ---------------------------------------------------------------------------

describe("timeToOffset", () => {
  it("returns 0 for a time equal to startHour", () => {
    expect(timeToOffset("09:00", 9)).toBe(0);
  });

  it("returns 1 for exactly 1 hour after startHour", () => {
    expect(timeToOffset("10:00", 9)).toBe(1);
  });

  it("handles fractional minutes correctly", () => {
    expect(timeToOffset("09:30", 9)).toBeCloseTo(0.5);
    expect(timeToOffset("09:15", 9)).toBeCloseTo(0.25);
  });

  it("works when startHour is 0", () => {
    expect(timeToOffset("02:00", 0)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// formatHour
// ---------------------------------------------------------------------------

describe("formatHour", () => {
  it("formats midnight as '12 AM'", () => {
    expect(formatHour(0)).toBe("12 AM");
  });

  it("formats noon as '12 PM'", () => {
    expect(formatHour(12)).toBe("12 PM");
  });

  it("formats AM hours correctly", () => {
    expect(formatHour(6)).toBe("6 AM");
    expect(formatHour(11)).toBe("11 AM");
  });

  it("formats PM hours correctly", () => {
    expect(formatHour(13)).toBe("1 PM");
    expect(formatHour(22)).toBe("10 PM");
  });
});
