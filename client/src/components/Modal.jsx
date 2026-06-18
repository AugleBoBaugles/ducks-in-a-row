// Modal.jsx
// Shared overlay + box + close-button shell used by TaskDetailModal and HelpModal.
//
// Props:
//   onClose  — called when the backdrop or × button is clicked
//   zIndex   — z-index override (default 200; use 300 when stacking above another modal)
//   children — modal body content

import styles from "./Modal.module.css";

export default function Modal({ onClose, zIndex = 200, children }) {
  return (
    <div className={styles.overlay} style={{ zIndex }} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}
