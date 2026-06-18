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
//   onReset()                 — clears session and resets the conversation

import { useState } from "react";
import { useSession } from "../hooks/useSession.js";
import { useRecorder } from "../hooks/useRecorder.js";
import { useAudioPlayback } from "../hooks/useAudioPlayback.js";
import DuckButton from "../components/DuckButton.jsx";
import styles from "./ConversationPage.module.css";

const MOCK_SCHEDULE = {
  tasks: [
    { id: 1, name: "Deep work block",     duration: 90, priority: "high",   completed: false },
    { id: 2, name: "Answer emails",        duration: 30, priority: "medium", completed: false },
    { id: 3, name: "Review pull requests", duration: 45, priority: "high",   completed: false },
    { id: 4, name: "Plan tomorrow",        duration: 20, priority: "low",    completed: false },
  ],
  schedule: [
    { startTime: "09:00", endTime: "10:30", label: "Deep work block",     type: "task"  },
    { startTime: "10:30", endTime: "10:45", label: "Break",               type: "break" },
    { startTime: "10:45", endTime: "11:15", label: "Answer emails",       type: "task"  },
    { startTime: "11:15", endTime: "12:00", label: "Review pull requests",type: "task"  },
    { startTime: "12:00", endTime: "13:00", label: "Lunch",               type: "break" },
    { startTime: "13:00", endTime: "13:20", label: "Plan tomorrow",       type: "task"  },
  ],
};

export default function ConversationPage({ onScheduleReady, onReset }) {
  const sessionId = useSession();
  const { isRecording, start, stop } = useRecorder({ maxSeconds: 60 });
  const { isPlaying, play } = useAudioPlayback();

  // Tracks what the app is currently doing — drives status text and duck animation
  // 'idle' | 'recording' | 'processing' | 'speaking' | 'error'
  const [phase, setPhase] = useState("idle");
  const [statusText, setStatusText] = useState("");
  const [duckyReply, setDuckyReply] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const MORTIMER_INTRO = "My name is Mortimer. I'm here to help you plan your day — tell me what you need to get done, and we'll figure out when to do it. Click the duck when you're ready.";

  async function handleHelp() {
    if (phase === "processing" || phase === "speaking") return;
    setHasStarted(true);
    setChatHistory((h) => [...h, { role: "duck", text: MORTIMER_INTRO }]);
    setDuckyReply(MORTIMER_INTRO);
    await playReply(MORTIMER_INTRO);
    setPhase("idle");
    setStatusText("");
  }

  async function handleDuckClick() {
    // Don't allow clicking while the server is working or audio is playing
    if (phase === "processing" || phase === "speaking") return;

    if (!isRecording) {
      // ---- START RECORDING ----
      setHasStarted(true);
      if (duckyReply) {
        setChatHistory((h) => [...h, { role: "duck", text: duckyReply }]);
      }
      setDuckyReply("");

      try {
        // start() awaits mic permission, then recording begins
        await start();
        setPhase("recording");
        setStatusText("Listening... click the duck to stop.");
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

      if (data.text) setChatHistory((h) => [...h, { role: "user", text: data.text }]);
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

  return (
    <div className={styles.page}>
      {/* Fixed top section — duck, status, current reply */}
      <div className={styles.main}>
        {!hasStarted && (
          <p className={styles.intro}>click to speak — click again to stop</p>
        )}

        <DuckButton
          onClick={handleDuckClick}
          phase={phase}
          isRecording={isRecording}
          isPlaying={isPlaying}
          size="large"
          ariaLabel={isRecording ? "Stop recording" : "Start speaking"}
        />

        {!hasStarted && (
          <div className={styles.introActions}>
            <button className={styles.helpBtn} onClick={handleHelp}>
              who are you?
            </button>
            <button className={styles.skipBtn} onClick={() => onScheduleReady(MOCK_SCHEDULE)}>
              skip to schedule →
            </button>
          </div>
        )}

        {statusText && (
          <p className={`${styles.status} ${phase === "error" ? styles.statusError : ""}`}>
            {statusText}
          </p>
        )}

        {duckyReply && (
          <blockquote className={styles.reply}>
            {duckyReply}
          </blockquote>
        )}

        {hasStarted && (
          <button className={styles.resetBtn} onClick={onReset}>
            start over
          </button>
        )}
      </div>

      {/* Scrollable history — grows downward without moving the duck */}
      {chatHistory.length > 0 && (
        <div className={styles.history}>
          {chatHistory.slice().reverse().map((entry, i) => (
            <div key={i} className={entry.role === "user" ? styles.historyUser : styles.historyDuck}>
              <span className={styles.historyRole}>{entry.role === "user" ? "You" : "Mortimer"}</span>
              <span className={styles.historyText}>{entry.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
