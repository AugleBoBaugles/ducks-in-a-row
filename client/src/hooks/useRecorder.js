// useRecorder.js
// React hook that wraps the browser's MediaRecorder API for audio capture.
// Ported from the original public/recorder.js but adapted to React patterns.
//
// Usage:
//   const { isRecording, start, stop } = useRecorder({ maxSeconds: 60 });
//
// - Call start() to request mic access and begin recording.
// - Call stop() to end recording; it resolves with an audio Blob.
// - isRecording is true while the mic is active.

import { useState, useRef } from "react";

export function useRecorder({ maxSeconds = 60 } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const resolveRef = useRef(null); // holds the Promise resolve for stop()

  async function start() {
    // Request microphone permission from the browser
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    // Collect audio data as it comes in (every 250ms)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(250); // fire ondataavailable every 250ms
    setIsRecording(true);

    // Auto-stop after maxSeconds
    timerRef.current = setTimeout(() => stop(), maxSeconds * 1000);

    // Return a Promise that resolves with the audio Blob when stop() is called
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }

  function stop() {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    clearTimeout(timerRef.current);

    // onstop fires after the recorder flushes its final chunk
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });

      // Release the microphone — this turns off the browser's recording indicator
      streamRef.current?.getTracks().forEach((t) => t.stop());

      setIsRecording(false);
      resolveRef.current?.(blob); // resolve the Promise from start()
    };

    recorder.stop();
  }

  return { isRecording, start, stop };
}
