// TaskDetailModal.jsx
// Shown when a user clicks a task name in the TodoList.
// Displays task metadata, an editable notes field, and Mortimer's advice
// fetched from /advice on open.
//
// Props:
//   task         — { id, name, priority, duration, completed }
//   advice       — Mortimer's pre-fetched advice string (undefined while loading)
//   note         — current note string for this task
//   onNoteChange — called with (taskId, newNote) when the note is edited
//   onClose      — called when the modal should close

import styles from "./TaskDetailModal.module.css";
import { PRIORITY_COLORS } from "../utils/priorityColors.js";

export default function TaskDetailModal({ task, advice, note, onNoteChange, onClose }) {

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>

        <h2 className={styles.taskName}>{task.name}</h2>

        <div className={styles.meta}>
          <span className={styles.badge} style={{ color: PRIORITY_COLORS[task.priority] }}>
            {task.priority} priority
          </span>
          <span className={styles.duration}>{task.duration} min</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.section}>
          <p className={styles.sectionLabel}>Mortimer's take</p>
          {!advice || advice.length === 0
            ? <p className={styles.loading}>thinking...</p>
            : <ul className={styles.advice}>
                {advice.map((bullet, i) => <li key={i}>{bullet}</li>)}
              </ul>
          }
        </div>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>Your notes</p>
          <textarea
            className={styles.notes}
            value={note || ""}
            onChange={(e) => onNoteChange(task.id, e.target.value)}
            placeholder="Add context, links, anything you need to remember..."
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
