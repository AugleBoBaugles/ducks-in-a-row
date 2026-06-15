// TodoList.jsx
// Renders the list of tasks as interactive checkboxes.
// Striking through completed tasks gives the user a satisfying sense of progress.
//
// Props:
//   tasks    — array of task objects: [{ id, name, priority, completed }]
//   onToggle — called with the task id when a checkbox is clicked

import styles from "./TodoList.module.css";

// Priority badge colors map
const PRIORITY_COLORS = {
  high:   "var(--danger)",
  medium: "var(--yellow)",
  low:    "var(--text-muted)",
};

export default function TodoList({ tasks = [], onToggle }) {
  if (tasks.length === 0) {
    return <p className={styles.empty}>No tasks yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {tasks.map((task) => (
        <li key={task.id} className={styles.item}>
          <label className={styles.label}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onToggle(task.id)}
              className={styles.checkbox}
            />
            {/* Strike through name when done */}
            <span className={task.completed ? styles.done : styles.name}>
              {task.name}
            </span>
          </label>
          {/* Small colored dot showing priority */}
          <span
            className={styles.priority}
            style={{ color: PRIORITY_COLORS[task.priority] || "var(--text-muted)" }}
            title={`${task.priority} priority`}
          >
            ●
          </span>
        </li>
      ))}
    </ul>
  );
}
