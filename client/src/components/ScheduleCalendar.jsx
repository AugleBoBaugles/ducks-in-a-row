// ScheduleCalendar.jsx
// Renders a day-view timeline scoped to the scheduled blocks (± 1 hour buffer).
// Task and break blocks are overlaid on the relevant hour rows.
//
// Props:
//   blocks       — [{ startTime, endTime, label, type: "task"|"break" }]
//   hoveredLabel — label currently highlighted (controlled by SchedulePage)
//   onTaskHover  — called with label on task block mouseenter, null on mouseleave

import styles from "./ScheduleCalendar.module.css";
import { timeToOffset, formatHour, computeHourRange } from "./scheduleCalendarUtils.js";

export default function ScheduleCalendar({ blocks = [], hoveredLabel, onTaskHover }) {
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

          const isTask = block.type === "task";
          const isHighlighted = hoveredLabel === block.label;

          return (
            <div
              key={i}
              data-calendar-block={isTask ? block.label : undefined}
              className={[
                styles.block,
                isTask ? styles.taskBlock : styles.breakBlock,
                isHighlighted ? styles.blockHighlighted : "",
              ].join(" ")}
              style={{ top: topOffset, height: blockHeight }}
              onMouseEnter={isTask ? () => onTaskHover(block.label) : undefined}
              onMouseLeave={isTask ? () => onTaskHover(null) : undefined}
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
