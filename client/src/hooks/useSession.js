// useSession.js
// Generates a session ID once when the app loads and remembers it across
// re-renders. The session ID is sent to the server with every /transcribe
// request so the server can look up the correct conversation history.
//
// Uses sessionStorage so the ID survives React re-renders but resets when
// the browser tab is closed (giving each visit a fresh conversation).

import { useState } from "react";

function generateId() {
  // crypto.randomUUID() is available in all modern browsers
  return crypto.randomUUID();
}

export function useSession() {
  const [sessionId] = useState(() => {
    // Try to restore the ID from sessionStorage first.
    // If there isn't one (first load), generate and save it.
    const stored = sessionStorage.getItem("ducks-session-id");
    if (stored) return stored;
    const id = generateId();
    sessionStorage.setItem("ducks-session-id", id);
    return id;
  });

  return sessionId;
}
