// ScheduleCalendar.jsx
// Renders a day-view timeline — one row per hour from 6am to 10pm.
// Task and break blocks are overlaid on the relevant hour rows.
//
// Props:
//   blocks — array of schedule blocks from the LLM:
//     [{ startTime: "09:00", endTime: "10:30", label: "Study", type: "task"|"break" }]

import styles from "./ScheduleCalendar.module.css";

// Hours to display on the timeline (24-hour integers)
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 through 22

// Convert "HH:MM" to fractional hours from 6am (the timeline start)
// e.g. "09:30" → 3.5  (3.5 hours after 6am)
function timeToOffset(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return (h - 6) + m / 60;
}

// Format 24h hour integer to display label ("9 AM", "2 PM", etc.)
function formatHour(h) {
  if (h === 12) return "12 PM";
  if (h === 0)  return "12 AM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export default function ScheduleCalendar({ blocks = [] }) {
  // Pixels per hour — bigger values give short blocks (10–15 min breaks) enough
  // visible height without needing a min-height clamp that causes overlap.
  const HOUR_HEIGHT = 80;
  const totalHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <div className={styles.calendar}>
      {/* Hour grid lines and labels */}
      <div className={styles.grid} style={{ height: totalHeight }}>
        {HOURS.map((h) => (
          <div
            key={h}
            className={styles.hourRow}
            style={{ height: HOUR_HEIGHT }}
          >
            <span className={styles.hourLabel}>{formatHour(h)}</span>
            <div className={styles.hourLine} />
          </div>
        ))}

        {/* Overlay the schedule blocks on the grid */}
        {blocks.map((block, i) => {
          const topOffset  = timeToOffset(block.startTime) * HOUR_HEIGHT;
          const endOffset  = timeToOffset(block.endTime)   * HOUR_HEIGHT;
          const blockHeight = endOffset - topOffset;

          return (
            <div
              key={i}
              className={`${styles.block} ${block.type === "break" ? styles.breakBlock : styles.taskBlock}`}
              style={{ top: topOffset, height: blockHeight }}
              title={`${block.label} (${block.startTime}–${block.endTime})`}
            >
              <span className={styles.blockLabel}>{block.label}</span>
              <span className={styles.blockTime}>{block.startTime}–{block.endTime}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
