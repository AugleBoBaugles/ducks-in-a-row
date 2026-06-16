// useAudioPlayback.js
// Hook for playing back the duck's TTS response audio.
// Takes base64-encoded MP3 data (from the /tts API) and plays it in the browser.
//
// Usage:
//   const { isPlaying, play } = useAudioPlayback();
//   await play(base64Mp3String);
//
// isPlaying is true while the audio is actively playing — useful for
// animating the duck while it speaks.

import { useState, useRef } from "react";

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  async function play(base64Audio) {
    // Stop any currently playing audio before starting new
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Convert base64 string → binary → Blob → object URL the browser can play
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audioRef.current = audio;
    setIsPlaying(true);

    // Return a Promise so callers can await the audio finishing
    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url); // free memory
        setIsPlaying(false);
        resolve();
      };
      audio.onerror = () => {
        setIsPlaying(false);
        resolve(); // don't crash the app on audio errors
      };
      // play() returns a Promise that rejects in headless browsers (no audio
      // output device) or when autoplay is blocked. Catch it here so the
      // outer Promise still resolves and the app doesn't get stuck.
      audio.play().catch(() => {
        URL.revokeObjectURL(url);
        setIsPlaying(false);
        resolve();
      });
    });
  }

  return { isPlaying, play };
}
