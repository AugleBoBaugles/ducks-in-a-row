// =============================================================================
// GROQ WHISPER — WEB SERVER
// =============================================================================
// This file is intentionally thin. Its only job is:
//   1. Serve the frontend HTML page at localhost:3000
//   2. Define the /transcribe route and coordinate the two services
//
// The actual API logic lives in:
//   services/transcription.js  — Groq Whisper (speech → text)
//   services/rubberDucky.js    — Groq LLM (text → rubber ducky response)
//
// How to run:
//   npm start     (or: node server.js)
// =============================================================================


// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------

import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

// Import the two service functions. Each handles one API call.
import { transcribeAudio } from "./services/transcription.js";
import { askRubberDucky }  from "./services/rubberDucky.js";


// -----------------------------------------------------------------------------
// SETUP
// -----------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const app = express();
const groq_unused = null; // Groq client lives inside the services now

// Multer stores the uploaded file in memory as a Buffer.
// 25 MB matches Groq Whisper's maximum file size.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});


// -----------------------------------------------------------------------------
// MIDDLEWARE
// -----------------------------------------------------------------------------

// Serve everything in /public as static files.
// Visiting http://localhost:3000/ automatically returns public/index.html.
app.use(express.static(path.join(__dirname, "public")));


// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// POST /transcribe
// Called by the browser when the user clicks "Transcribe".
// Receives the audio file, runs it through both services, returns JSON.
app.post("/transcribe", upload.single("audio"), async (req, res) => {

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    // --- Step 1: Speech → Text ---
    // Pass the raw file buffer to the transcription service.
    // We await it because we need the text before we can call the LLM.
    console.log("Transcribing audio...");
    const text = await transcribeAudio(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    console.log("Transcription:", text);

    // --- Step 2: Text → Rubber Ducky Response ---
    // Send the transcribed text to the LLM service.
    console.log("Consulting the rubber ducky...");
    const ducky = await askRubberDucky(text);
    console.log("Ducky says:", ducky);

    // --- Step 3: Return both results to the browser ---
    // The frontend expects { text, ducky } and will display both.
    res.json({ text, ducky });

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop.");
});
