// =============================================================================
// services/transcription.js
// =============================================================================
// Responsible for one thing: taking an audio file and returning transcribed text.
//
// By isolating this logic in its own file ("service"), the server stays clean —
// it just calls transcribeAudio() without needing to know anything about how
// Groq Whisper works internally. This pattern is called "separation of concerns."
// =============================================================================

import Groq, { toFile } from "groq-sdk";

// Each service creates its own Groq client. The SDK is stateless (just an HTTP
// wrapper), so this is cheap — no persistent connection is held open.
// GROQ_API_KEY is already in process.env because server.js loaded dotenv first.
const groq = new Groq();


// -----------------------------------------------------------------------------
// transcribeAudio()
//
// Takes the raw bytes of an audio file (as a Node.js Buffer from multer),
// sends them to Groq's Whisper model, and returns the transcription as a string.
//
// Parameters:
//   buffer    {Buffer}  — the raw file bytes
//   filename  {string}  — original filename, e.g. "recording.m4a"
//   mimetype  {string}  — MIME type, e.g. "audio/m4a" or "audio/mpeg"
//
// Returns:
//   {Promise<string>}   — the transcribed text
// -----------------------------------------------------------------------------
export async function transcribeAudio(buffer, filename, mimetype) {

  // The Groq SDK doesn't accept a raw Buffer directly. toFile() wraps it in a
  // File object (a standard web API type) that the SDK knows how to upload.
  const file = await toFile(buffer, filename, { type: mimetype });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo", // fastest Whisper model on Groq
    response_format: "json",         // response will be { text: "..." }
    language: "en",
    temperature: 0.0,                // deterministic — same audio → same text
  });

  // Return just the string, not the whole response object.
  // The caller doesn't need to know the response shape.
  return transcription.text;
}
