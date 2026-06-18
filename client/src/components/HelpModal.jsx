// HelpModal.jsx
// Full instructions overlay, opened by the "?" button in the app header.
// Covers the full conversation-to-schedule flow for both pages.
//
// Props:
//   onClose — called when the user dismisses the modal

import styles from "./HelpModal.module.css";

const STEPS = [
  { n: "1", label: "Start talking", text: "Click the duck to start recording. Click again to stop." },
  { n: "2", label: "Answer his questions", text: "Tell Mortimer what you need to get done — tasks, rough durations, energy level. He'll ask follow-up questions across a few turns." },
  { n: "3", label: "Get your schedule", text: "Once he has enough, he builds a realistic day plan with breaks included." },
  { n: "4", label: "Explore the schedule", text: "Click any task card for Mortimer's tips on tackling it. Hover a calendar block to highlight the matching task." },
  { n: "5", label: "Refine with the duck", text: "Use the duck panel on the right to adjust the plan mid-day — add tasks, move things around, or ask for a full rebuild." },
];

export default function HelpModal({ onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
        <h2 className={styles.title}>How it works</h2>
        <ol className={styles.steps}>
          {STEPS.map(({ n, label, text }) => (
            <li key={n} className={styles.step}>
              <span className={styles.num}>{n}</span>
              <div>
                <span className={styles.label}>{label}</span>
                <span className={styles.text}>{text}</span>
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.note}>Mortimer speaks — make sure your volume is on.</p>
      </div>
    </div>
  );
}
