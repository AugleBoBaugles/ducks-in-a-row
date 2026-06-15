// DuckPanel.jsx
// A compact version of the duck interaction used on the Schedule page.
// Lets the user keep talking to the duck to refine their plan after the
// initial schedule has been generated.
//
// When the server returns an updated schedule, onScheduleUpdate() is called
// so SchedulePage can re-render the calendar and todo list.
//
// Props:
//   onScheduleUpdate(schedule) — called when the duck returns an updated plan

import { useState } from "react";
import { useSession } from "../hooks/useSession.js";
import { useRecorder } from "../hooks/useRecorder.js";
import { useAudioPlayback } from "../hooks/useAudioPlayback.js";
import styles from "./DuckPanel.module.css";

export default function DuckPanel({ onScheduleUpdate }) {
  const sessionId = useSession();
  const { isRecording, start, stop } = useRecorder({ maxSeconds: 60 });
  const { isPlaying, play } = useAudioPlayback();

  const [phase, setPhase] = useState("idle"); // 'idle'|'recording'|'processing'|'speaking'|'error'
  const [statusText, setStatusText] = useState("Talk to update your plan.");
  const [duckyReply, setDuckyReply] = useState("");

  async function handleDuckClick() {
    if (phase === "processing" || phase === "speaking") return;

    if (!isRecording) {
      // Start recording
      try {
        await start();
        setPhase("recording");
        setStatusText("Listening...");
        setDuckyReply("");
      } catch {
        setPhase("error");
        setStatusText("Microphone access denied.");
      }
    } else {
      // Stop and send
      setPhase("processing");
      setStatusText("Updating your plan...");
      const blob = await stop();
      if (blob) await sendToServer(blob);
    }
  }

  async function sendToServer(blob) {
    try {
      const form = new FormData();
      const ext = blob.type.includes("ogg") ? "ogg" : "webm";
      form.append("audio", blob, `recording.${ext}`);

      const res = await fetch("/transcribe", {
        method: "POST",
        headers: { "X-Session-Id": sessionId },
        body: form,
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      setDuckyReply(data.ducky);

      // If the duck produced a fresh schedule, update the parent
      if (data.schedule) {
        onScheduleUpdate(data.schedule);
      }

      // Speak the reply
      await playReply(data.ducky);
      setPhase("idle");
      setStatusText("Talk to update your plan.");

    } catch (err) {
      setPhase("error");
      setStatusText(`Error: ${err.message}`);
    }
  }

  async function playReply(text) {
    setPhase("speaking");
    try {
      const res = await fetch("/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const { audioContent } = await res.json();
      await play(audioContent);
    } catch { /* TTS failure is non-fatal */ }
  }

  const duckClass = isRecording ? styles.recording
    : isPlaying         ? styles.speaking
    : styles.idle;

  return (
    <div className={styles.panel}>
      {/* Compact duck button */}
      <button
        className={`${styles.duck} ${duckClass}`}
        onClick={handleDuckClick}
        aria-label={isRecording ? "Stop recording" : "Speak to the duck"}
        disabled={phase === "processing"}
      >
        <img src="/duck.svg" alt="rubber duck" />
      </button>

      <p className={`${styles.status} ${phase === "error" ? styles.error : ""}`}>
        {statusText}
      </p>

      {duckyReply && (
        <blockquote className={styles.reply}>{duckyReply}</blockquote>
      )}
    </div>
  );
}
