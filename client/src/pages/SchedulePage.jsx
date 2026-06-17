// SchedulePage.jsx
// The plan view — shown after the duck has gathered enough info to build a schedule.
// Split into three vertical columns:
//   Left   — hourly calendar timeline (ScheduleCalendar)
//   Center — interactive to-do list (TodoList)
//   Right  — duck panel for follow-up conversation (DuckPanel)
//
// Props:
//   schedule          — { tasks: [], schedule: [] } from the LLM
//   onScheduleUpdated — called when the duck refines the plan mid-conversation
//   onReset()         — clears session and returns to the conversation page

import { useState, useEffect } from "react";
import ScheduleCalendar from "../components/ScheduleCalendar.jsx";
import TodoList from "../components/TodoList.jsx";
import DuckPanel from "../components/DuckPanel.jsx";
import styles from "./SchedulePage.module.css";

export default function SchedulePage({ schedule, onScheduleUpdated, onReset }) {
  const [tasks, setTasks] = useState(schedule.tasks);
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const [lineCoords, setLineCoords] = useState(null);

  // When a calendar block is hovered, measure the block and its matching task item
  // and compute the bezier endpoints for the connecting line.
  useEffect(() => {
    if (!hoveredLabel) {
      setLineCoords(null);
      return;
    }
    const blockEl = document.querySelector(`[data-calendar-block="${CSS.escape(hoveredLabel)}"]`);
    const taskEl  = document.querySelector(`[data-task-item="${CSS.escape(hoveredLabel)}"]`);
    if (!blockEl || !taskEl) { setLineCoords(null); return; }

    const br = blockEl.getBoundingClientRect();
    const tr = taskEl.getBoundingClientRect();
    setLineCoords({
      x1: br.left,
      y1: (br.top + br.bottom) / 2,
      x2: tr.right,
      y2: (tr.top + tr.bottom) / 2,
    });
  }, [hoveredLabel]);

  // Toggle a task's completed state when the user checks/unchecks it
  function handleToggle(id) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  // Called by DuckPanel when a follow-up conversation updates the plan
  function handleScheduleUpdate(newSchedule) {
    setTasks(newSchedule.tasks);
    onScheduleUpdated(newSchedule);
  }

  const completedLabels = new Set(tasks.filter((t) => t.completed).map((t) => t.name));
  const midX = lineCoords ? (lineCoords.x1 + lineCoords.x2) / 2 : 0;

  return (
    <div className={styles.page}>
      {/* SVG overlay for the calendar→task connecting line */}
      {lineCoords && (
        <svg className={styles.svgOverlay}>
          <path
            d={`M ${lineCoords.x1} ${lineCoords.y1} C ${midX} ${lineCoords.y1}, ${midX} ${lineCoords.y2}, ${lineCoords.x2} ${lineCoords.y2}`}
            stroke="var(--yellow)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeOpacity="0.55"
            fill="none"
          />
        </svg>
      )}

      {/* Left column: to-do list with checkboxes */}
      <section className={styles.column}>
        <h2 className={styles.columnTitle}>Tasks</h2>
        <TodoList tasks={tasks} onToggle={handleToggle} hoveredLabel={hoveredLabel} onTaskHover={setHoveredLabel} />
      </section>

      {/* Center column: hourly day view calendar */}
      <section className={styles.column}>
        <h2 className={styles.columnTitle}>Your Day</h2>
        <ScheduleCalendar
          blocks={schedule.schedule}
          hoveredLabel={hoveredLabel}
          onTaskHover={setHoveredLabel}
          completedLabels={completedLabels}
        />
      </section>

      {/* Right column: duck for follow-up edits */}
      <section className={styles.column}>
        <h2 className={styles.columnTitle}>The Duck</h2>
        <DuckPanel onScheduleUpdate={handleScheduleUpdate} />
        <button className={styles.resetBtn} onClick={onReset}>
          start over
        </button>
      </section>
    </div>
  );
}
