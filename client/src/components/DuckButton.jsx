// DuckButton.jsx
// Animated duck button shared by ConversationPage (large) and DuckPanel (small).
//
// Props:
//   onClick     — click handler
//   phase       — 'idle'|'recording'|'processing'|'speaking'|'error'
//   isRecording — boolean from useRecorder
//   isPlaying   — boolean from useAudioPlayback
//   size        — 'large' | 'small' (default 'large')
//   ariaLabel   — accessible label for the button

import styles from "./DuckButton.module.css";

export default function DuckButton({ onClick, phase, isRecording, isPlaying, size = "large", ariaLabel }) {
  const animClass = isRecording ? styles.recording
    : isPlaying ? styles.speaking
    : styles.idle;

  return (
    <button
      className={`${styles.duck} ${styles[size]} ${animClass}`}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={phase === "processing"}
    >
      <img src="/duck.png" alt="rubber duck" />
    </button>
  );
}
