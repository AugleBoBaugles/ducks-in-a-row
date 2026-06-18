// =============================================================================
// server.js
// =============================================================================
// Express web server. Its jobs:
//   1. Serve the React frontend build (or proxy in dev — see client/vite.config.js)
//   2. POST /transcribe — receives audio, runs Whisper + LLM, returns response
//   3. POST /tts       — takes text, returns Google TTS audio as base64
//
// Services do the actual API work; this file just wires them together.
// =============================================================================

import express from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import "dotenv/config";

import { transcribeAudio } from "./services/transcription.js";
import { askRubberDucky, getTaskAdvice } from "./services/rubberDucky.js";
import { synthesizeSpeech } from "./services/tts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const app = express();

// Multer stores the uploaded audio file in memory as a Buffer.
// 25 MB matches Groq Whisper's max file size.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});


// -----------------------------------------------------------------------------
// SESSION STORE
// Maps a session ID (UUID) to that session's conversation history.
// History is an array of { role: 'user'|'assistant', content: string } objects —
// the same format the LLM API expects, so we can pass it directly.
//
// Note: this is in-memory, so sessions are lost on server restart.
// Fine for a demo; a real app would use Redis or a database.
// -----------------------------------------------------------------------------
const sessions = new Map(); // sessionId → message[]


// -----------------------------------------------------------------------------
// MIDDLEWARE
// -----------------------------------------------------------------------------

// Parse JSON request bodies (used by the /tts route)
app.use(express.json());

// Serve the built React app from client/dist in production.
// In dev, Vite runs on its own port and proxies API requests here.
app.use(express.static(path.join(__dirname, "client", "dist")));


// -----------------------------------------------------------------------------
// POST /transcribe
// Receives an audio blob, transcribes it, gets a duck response, returns both.
//
// Request:  multipart/form-data with an "audio" file field
//           Header X-Session-Id: <uuid>  (client sends this to maintain conversation)
//
// Response: { text, ducky, schedule, sessionId }
//   text      — what the user said (from Whisper)
//   ducky     — the duck's reply text
//   schedule  — parsed schedule object, or null if the duck isn't ready yet
//   sessionId — echo back so the client can store it on first contact
// -----------------------------------------------------------------------------
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded." });
  }

  // Retrieve or create a session ID. The client sends X-Session-Id after the
  // first request; on first contact the header won't be present so we create one.
  const sessionId = req.headers["x-session-id"] || randomUUID();
  const history = sessions.get(sessionId) || [];

  try {
    // Step 1: Speech → Text
    console.log(`[${sessionId.slice(0, 8)}] Transcribing audio...`);
    const text = await transcribeAudio(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    console.log(`[${sessionId.slice(0, 8)}] User said: "${text}"`);

    // If Whisper got silence or noise it returns an empty string.
    // Skip the LLM and send a canned response so the duck doesn't hallucinate.
    if (!text || text.trim().length < 3) {
      return res.json({
        text: "",
        ducky: "I didn't catch that. Try again?",
        schedule: null,
        sessionId,
      });
    }

    // Step 2: Text + history → Duck response + optional schedule
    console.log(`[${sessionId.slice(0, 8)}] Consulting the duck...`);
    const { reply, schedule } = await askRubberDucky(text, history);
    console.log(`[${sessionId.slice(0, 8)}] Duck says: "${reply}"`);
    if (schedule) console.log(`[${sessionId.slice(0, 8)}] Schedule ready!`);

    // Step 3: Append this turn to the session history so the next request
    // has full context of what was said before.
    sessions.set(sessionId, [
      ...history,
      { role: "user",      content: text  },
      { role: "assistant", content: reply },
    ]);

    res.json({ text, ducky: reply, schedule, sessionId });

  } catch (err) {
    console.error(`[${sessionId.slice(0, 8)}] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});


// -----------------------------------------------------------------------------
// POST /advice
// Returns Mortimer's advice on a specific task.
//
// Request:  JSON body { taskName, priority, duration }
// Response: { advice: string }
// -----------------------------------------------------------------------------
app.post("/advice", async (req, res) => {
  const { taskName, priority, duration } = req.body;
  if (!taskName) return res.status(400).json({ error: "taskName is required." });

  try {
    const advice = await getTaskAdvice(taskName, priority || "medium", duration || 30);
    res.json({ advice });
  } catch (err) {
    console.error("Advice error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// -----------------------------------------------------------------------------
// POST /tts
// Converts the duck's text reply to speech using Google Cloud TTS.
//
// Request:  JSON body { text: string }
// Response: { audioContent: string }  — base64-encoded MP3 audio
//
// The client decodes this and plays it back through an <audio> element.
// -----------------------------------------------------------------------------
app.post("/tts", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text provided." });
  }

  try {
    const audioContent = await synthesizeSpeech(text);
    res.json({ audioContent });
  } catch (err) {
    console.error("TTS error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// -----------------------------------------------------------------------------
// Catch-all: serve the React app for any non-API route (client-side routing).
// Express 5 + path-to-regexp v8 requires a named wildcard — bare "*" is invalid.
// -----------------------------------------------------------------------------
app.get("/*path", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});


// -----------------------------------------------------------------------------
// START
// Export the app so integration tests can import it without starting a server.
// When this file is run directly (not imported by tests), start listening.
// -----------------------------------------------------------------------------
export default app;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log("Press Ctrl+C to stop.");
  });
}
