// ScheduleCalendar.jsx
// Renders a day-view timeline scoped to the scheduled blocks (± 1 hour buffer).
// Task and break blocks are overlaid on the relevant hour rows.
//
// Props:
//   blocks       — [{ startTime, endTime, label, type: "task"|"break" }]
//   hoveredLabel — label currently highlighted (controlled by SchedulePage)
//   onTaskHover     — called with label on task block mouseenter, null on mouseleave
//   completedLabels — Set of task names that have been checked off

import { useState, useEffect } from "react";
import styles from "./ScheduleCalendar.module.css";
import { timeToOffset, formatHour, computeHourRange } from "./scheduleCalendarUtils.js";

function getNowOffset(startHour, endHour) {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < startHour || h >= endHour) return null;
  return timeToOffset(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, startHour);
}

export default function ScheduleCalendar({ blocks = [], hoveredLabel, onTaskHover, completedLabels = new Set() }) {
  const HOUR_HEIGHT = 80;

  const { startHour, endHour, hours: HOURS } = computeHourRange(blocks);
  const totalHeight = HOURS.length * HOUR_HEIGHT;

  const [nowOffset, setNowOffset] = useState(() => getNowOffset(startHour, endHour));

  useEffect(() => {
    setNowOffset(getNowOffset(startHour, endHour));
    const id = setInterval(() => setNowOffset(getNowOffset(startHour, endHour)), 60_000);
    return () => clearInterval(id);
  }, [startHour, endHour]);

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
          const isDone = isTask && completedLabels.has(block.label);

          return (
            <div
              key={i}
              data-calendar-block={isTask ? block.label : undefined}
              className={[
                styles.block,
                isTask ? styles.taskBlock : styles.breakBlock,
                isHighlighted ? styles.blockHighlighted : "",
                isDone ? styles.blockDone : "",
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
        {/* Current time indicator */}
        {nowOffset !== null && (
          <div className={styles.nowLine} style={{ top: nowOffset * HOUR_HEIGHT }}>
            <div className={styles.nowDot} />
          </div>
        )}
      </div>
    </div>
  );
}
