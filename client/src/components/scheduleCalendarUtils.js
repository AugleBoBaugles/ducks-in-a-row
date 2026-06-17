// Pure helpers for ScheduleCalendar — extracted so they can be unit-tested
// without a DOM or React rendering environment.

// Convert "HH:MM" to fractional hours relative to startHour.
// e.g. timeToOffset("09:30", 8) → 1.5
export function timeToOffset(timeStr, startHour) {
  const [h, m] = timeStr.split(":").map(Number);
  return (h - startHour) + m / 60;
}

// Format a 24-hour integer to a display label ("9 AM", "2 PM", etc.)
export function formatHour(h) {
  if (h === 12) return "12 PM";
  if (h === 0)  return "12 AM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// Derive the visible hour range from a set of blocks with a ±1 hour buffer.
// Falls back to 6–22 when blocks is empty.
// Returns { startHour, endHour, hours } where hours is the array of integers.
export function computeHourRange(blocks) {
  let startHour = 6;
  let endHour = 22;

  if (blocks.length > 0) {
    const minH = Math.min(...blocks.map((b) => parseInt(b.startTime)));
    const maxH = Math.max(...blocks.map((b) => {
      const [h, m] = b.endTime.split(":").map(Number);
      return m > 0 ? h + 1 : h;
    }));
    startHour = Math.max(0, minH - 1);
    endHour   = Math.min(23, maxH + 1);
  }

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);
  return { startHour, endHour, hours };
}
