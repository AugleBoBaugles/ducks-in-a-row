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

import { useState } from "react";
import ScheduleCalendar from "../components/ScheduleCalendar.jsx";
import TodoList from "../components/TodoList.jsx";
import DuckPanel from "../components/DuckPanel.jsx";
import styles from "./SchedulePage.module.css";

export default function SchedulePage({ schedule, onScheduleUpdated, onReset }) {
  // tasks is a local copy so the user can toggle checkboxes without re-fetching
  const [tasks, setTasks] = useState(schedule.tasks);

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

  return (
    <div className={styles.page}>
      {/* Left column: to-do list with checkboxes */}
      <section className={styles.column}>
        <h2 className={styles.columnTitle}>Tasks</h2>
        <TodoList tasks={tasks} onToggle={handleToggle} />
      </section>

      {/* Center column: hourly day view calendar */}
      <section className={styles.column}>
        <h2 className={styles.columnTitle}>Your Day</h2>
        <ScheduleCalendar blocks={schedule.schedule} />
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
