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
import { timeToOffset, formatHour, formatTime, computeHourRange } from "./scheduleCalendarUtils.js";

function getNow(startHour, endHour) {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < startHour || h >= endHour) return null;
  const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const label = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return { offset: timeToOffset(timeStr, startHour), label };
}

export default function ScheduleCalendar({ blocks = [], hoveredLabel, onTaskHover, completedLabels = new Set() }) {
  const HOUR_HEIGHT = 80;

  const { startHour, endHour, hours: HOURS } = computeHourRange(blocks);
  const totalHeight = HOURS.length * HOUR_HEIGHT;

  const [now, setNow] = useState(() => getNow(startHour, endHour));
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    setNow(getNow(startHour, endHour));
    const id = setInterval(() => setNow(getNow(startHour, endHour)), 60_000);
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
              onMouseEnter={(e) => {
                setTooltip({ label: block.label, startTime: block.startTime, endTime: block.endTime, x: e.clientX, y: e.clientY });
                if (isTask) onTaskHover(block.label);
              }}
              onMouseMove={(e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
              onMouseLeave={() => {
                setTooltip(null);
                if (isTask) onTaskHover(null);
              }}
            >
              {blockHeight >= 22 && <span className={styles.blockLabel}>{block.label}</span>}
              {blockHeight >= 42 && <span className={styles.blockTime}>{formatTime(block.startTime)}–{formatTime(block.endTime)}</span>}
            </div>
          );
        })}
        {/* Current time indicator */}
        {now !== null && (
          <div className={styles.nowLine} style={{ top: now.offset * HOUR_HEIGHT }}>
            <div className={styles.nowDot} />
            <span className={styles.nowLabel}>{now.label}</span>
          </div>
        )}
      </div>
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <div className={styles.tooltipLabel}>{tooltip.label}</div>
          <div className={styles.tooltipTime}>{formatTime(tooltip.startTime)}–{formatTime(tooltip.endTime)}</div>
        </div>
      )}
    </div>
  );
}
