// ScheduleCalendar.jsx
// Renders a day-view timeline scoped to the scheduled blocks (± 1 hour buffer).
// Task and break blocks are overlaid on the relevant hour rows.
//
// Props:
//   blocks — array of schedule blocks from the LLM:
//     [{ startTime: "09:00", endTime: "10:30", label: "Study", type: "task"|"break" }]

import styles from "./ScheduleCalendar.module.css";
import { timeToOffset, formatHour, computeHourRange } from "./scheduleCalendarUtils.js";

export default function ScheduleCalendar({ blocks = [] }) {
  // Pixels per hour — bigger values give short blocks (10–15 min breaks) enough
  // visible height without needing a min-height clamp that causes overlap.
  const HOUR_HEIGHT = 80;

  const { startHour, hours: HOURS } = computeHourRange(blocks);
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
          const topOffset  = timeToOffset(block.startTime, startHour) * HOUR_HEIGHT;
          const endOffset  = timeToOffset(block.endTime,   startHour) * HOUR_HEIGHT;
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
