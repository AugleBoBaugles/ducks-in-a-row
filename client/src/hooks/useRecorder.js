// useRecorder.js
// React hook that wraps the browser's MediaRecorder API for audio capture.
//
// API:
//   start() → Promise<void>  — requests mic, begins recording (awaits permission only)
//   stop()  → Promise<Blob>  — ends recording, returns the audio Blob
//   isRecording — true while mic is active
//
// Usage pattern in a component:
//   const { isRecording, start, stop } = useRecorder({ maxSeconds: 60 });
//
//   // on "record" button click:
//   await start();            // awaits mic permission, then recording begins
//
//   // on "stop" button click:
//   const blob = await stop(); // returns audio Blob when MediaRecorder finishes flushing

import { useState, useRef } from "react";

export function useRecorder({ maxSeconds = 60 } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const autoStopTimerRef = useRef(null);

  // start() — requests mic permission and begins recording.
  // Resolves once recording is actively underway.
  // Throws if the user denies mic access.
  async function start() {
    chunksRef.current = [];

    // getUserMedia prompts the browser's mic permission dialog
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    // Collect audio chunks as they arrive (every 250ms)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(250);
    setIsRecording(true);

    // Auto-stop when maxSeconds is reached
    autoStopTimerRef.current = setTimeout(() => stop(), maxSeconds * 1000);
  }

  // stop() — ends recording and returns the audio as a Blob.
  // The Promise resolves after MediaRecorder has flushed its last chunk.
  function stop() {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) { resolve(null); return; }

      clearTimeout(autoStopTimerRef.current);

      recorder.onstop = () => {
        // Use the recorder's actual MIME type so the server gets the right format
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Release the microphone — this turns off the browser's recording indicator
        streamRef.current?.getTracks().forEach((t) => t.stop());

        setIsRecording(false);
        resolve(blob);
      };

      recorder.stop();
    });
  }

  return { isRecording, start, stop };
}
