// ConversationPage.jsx
// The opening screen: a rubber duck in the dark abyss.
//
// Flow:
//   1. User clicks the duck → mic starts recording
//   2. User clicks again → recording stops, audio sent to /transcribe
//   3. Server returns the duck's reply text + optional schedule JSON
//   4. Reply is played via TTS (/tts endpoint) and shown as text
//   5. If a schedule is returned, call onScheduleReady() to switch pages
//
// Props:
//   onScheduleReady(schedule) — called when the LLM returns a finished schedule

import { useState } from "react";
import { useSession } from "../hooks/useSession.js";
import { useRecorder } from "../hooks/useRecorder.js";
import { useAudioPlayback } from "../hooks/useAudioPlayback.js";
import styles from "./ConversationPage.module.css";

export default function ConversationPage({ onScheduleReady }) {
  const sessionId = useSession();
  const { isRecording, start, stop } = useRecorder({ maxSeconds: 60 });
  const { isPlaying, play } = useAudioPlayback();

  // Tracks what the app is currently doing — drives status text and duck animation
  // 'idle' | 'recording' | 'processing' | 'speaking' | 'error'
  const [phase, setPhase] = useState("idle");
  const [statusText, setStatusText] = useState("");
  const [duckyReply, setDuckyReply] = useState("");
  const [hasStarted, setHasStarted] = useState(false); // hide intro text after first click

  async function handleDuckClick() {
    // Don't allow clicking while the server is working or audio is playing
    if (phase === "processing" || phase === "speaking") return;

    if (!isRecording) {
      // ---- START RECORDING ----
      setHasStarted(true);
      setDuckyReply("");

      try {
        // start() awaits mic permission, then recording begins
        await start();
        setPhase("recording");
        setStatusText("Listening...");
      } catch {
        setPhase("error");
        setStatusText("Microphone access denied. Please allow mic access and try again.");
      }

    } else {
      // ---- STOP RECORDING → SEND TO SERVER ----
      setPhase("processing");
      setStatusText("The duck is thinking...");

      // stop() resolves with the audio Blob once MediaRecorder finishes flushing
      const blob = await stop();
      if (blob) await sendToServer(blob);
    }
  }

  async function sendToServer(blob) {
    try {
      // Build a multipart form upload with the audio file
      const form = new FormData();
      const ext = blob.type.includes("ogg") ? "ogg" : "webm";
      form.append("audio", blob, `recording.${ext}`);

      // Include the session ID so the server can retrieve this conversation's history
      const res = await fetch("/transcribe", {
        method: "POST",
        headers: { "X-Session-Id": sessionId },
        body: form,
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      setDuckyReply(data.ducky);

      // If the duck decided it has enough info, hand off the schedule and leave
      if (data.schedule) {
        onScheduleReady(data.schedule);
        return;
      }

      // Otherwise, speak the reply aloud then return to idle
      await playReply(data.ducky);
      setPhase("idle");
      setStatusText("");

    } catch (err) {
      setPhase("error");
      setStatusText(`Something went wrong: ${err.message}`);
    }
  }

  async function playReply(text) {
    setPhase("speaking");
    setStatusText("The duck speaks...");

    try {
      const res = await fetch("/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return; // TTS failure is non-fatal; text is still shown
      const { audioContent } = await res.json();
      await play(audioContent);
    } catch {
      // Don't crash the app if TTS fails — the text reply is still visible
    }
  }

  // Pick the CSS class that controls which duck animation plays
  const duckClass = isRecording ? styles.recording
    : isPlaying         ? styles.speaking
    : styles.idle;

  return (
    <div className={styles.page}>
      {/* Intro prompt — fades out after first click */}
      {!hasStarted && (
        <p className={styles.intro}>click the duck to begin</p>
      )}

      {/* The duck — click to start/stop recording */}
      <button
        className={`${styles.duck} ${duckClass}`}
        onClick={handleDuckClick}
        aria-label={isRecording ? "Stop recording" : "Start speaking"}
        disabled={phase === "processing"}
      >
        <img src="/duck.svg" alt="rubber duck" />
      </button>

      {/* Status line shown during processing / speaking / errors */}
      {statusText && (
        <p className={`${styles.status} ${phase === "error" ? styles.statusError : ""}`}>
          {statusText}
        </p>
      )}

      {/* The duck's last reply — styled as a wise quote */}
      {duckyReply && (
        <blockquote className={styles.reply}>
          {duckyReply}
        </blockquote>
      )}
    </div>
  );
}
