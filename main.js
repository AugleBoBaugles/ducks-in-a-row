// =============================================================================
// GROQ WHISPER TRANSCRIPTION DEMO
// =============================================================================
// What this file does:
//   1. Reads your API key from the .env file
//   2. Opens an audio file from the /data folder
//   3. Sends it to Groq's Whisper API (a speech-to-text AI model)
//   4. Prints the transcribed text to the console
//
// How to run:
//   node main.js       (or: npm run dev)
//
//   The "dotenv" package reads your .env file and loads every KEY=VALUE pair
//   into process.env automatically when the script starts.
// =============================================================================


// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url"; // Needed to correctly resolve __dirname on Windows (see below)
import "dotenv/config";

// "Groq" is the official JavaScript SDK (Software Development Kit) from Groq.
// It's a pre-built client that wraps all of Groq's API endpoints so you don't
// have to write raw HTTP requests by hand.
import Groq from "groq-sdk";

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

// fileURLToPath correctly converts a file:// URL to an OS-native path.
// On Windows, new URL(import.meta.url).pathname returns "/C:/Users/..." with a
// leading slash, which corrupts the path (you'd get C:\C:\...). fileURLToPath
// strips that leading slash and handles drive letters properly.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_FILE_PATH = path.join(__dirname, "data", "Test-Recording.m4a"); // Name of file in /data folder to transcribe

// -----------------------------------------------------------------------------
// GROQ CLIENT SETUP
// -----------------------------------------------------------------------------

// Create a new instance of the Groq client.
// No API key argument needed here! The Groq SDK automatically looks for an
// environment variable named "GROQ_API_KEY" in process.env. Since dotenv
// already loaded our .env file above, the key is available and picked up
// here without us having to pass it manually.
const groq = new Groq();

// -----------------------------------------------------------------------------
// MAIN FUNCTION
// -----------------------------------------------------------------------------

// We wrap our logic in an "async function" because calling the Groq API is
// an asynchronous operation — it sends a network request and waits for a
// response. Using "async/await" lets us write that waiting logic in a clean,
// readable way instead of nesting callbacks.
async function main() {

  console.log("Reading audio file:", AUDIO_FILE_PATH);

  // fs.createReadStream() opens the file and creates a "stream" — meaning
  // Node.js reads and sends the file in chunks rather than loading the entire
  // file into memory at once. This is efficient for large audio files.
  //
  // We don't open the stream yet; we just describe it here and pass it below.
  // If the file doesn't exist, the error will surface when the API call runs.
  const audioStream = fs.createReadStream(AUDIO_FILE_PATH);

  console.log("Sending to Groq Whisper API... (this may take a moment)");

  // groq.audio.transcriptions.create() is the Groq SDK method for
  // speech-to-text transcription. Internally it sends a POST request to:
  //   https://api.groq.com/openai/v1/audio/transcriptions
  //
  // The "await" keyword pauses execution here until Groq responds.
  // While it's waiting, Node.js can do other work — it won't freeze.
  const transcription = await groq.audio.transcriptions.create({

    // REQUIRED — the audio data to transcribe.
    // Groq accepts a file stream, a Buffer, or a Blob.
    // Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, flac
    file: audioStream,

    // REQUIRED — which AI model to use for transcription.
    // "whisper-large-v3-turbo" is Groq's fastest Whisper model.
    // Other options: "whisper-large-v3" (more accurate, slower)
    //                "distil-whisper-large-v3-en" (English-only, very fast)
    model: "whisper-large-v3-turbo",

    // OPTIONAL — hint text to help the model understand context.
    // Useful for technical jargon, names, or abbreviations the model
    // might not recognize. You can also correct common mis-transcriptions here.
    // Example: "This is a conversation about TypeScript and React hooks."
    // Leave as an empty string or remove if you have no context to add.
    prompt: "This is a test sentence.",

    // OPTIONAL — the format of the API response.
    // "text"         → returns a plain string (just the transcript)
    // "json"         → returns { text: "..." }
    // "verbose_json" → returns a detailed object with word/segment timestamps
    //                  (required if you want timestamp_granularities below)
    // "srt" or "vtt" → returns subtitle file formats
    response_format: "json",

    // OPTIONAL — tell the model which language the audio is in.
    // This improves speed and accuracy. Use ISO 639-1 codes (e.g. "en", "es", "fr").
    // Remove or set to null to let Whisper auto-detect the language.
    language: "en",

    // OPTIONAL — controls how "creative" the transcription can be.
    // 0.0 = deterministic (same input always gives same output) — best for accuracy
    // Higher values introduce variability — generally not useful for transcription
    temperature: 0.0,

  });

  // At this point "transcription" is the parsed JSON response from Groq.
  // Because we used response_format: "json", it looks like: { text: "..." }
  //
  // Print just the transcribed text to the console.
  console.log("\n--- TRANSCRIPTION RESULT ---\n");
  console.log(transcription.text);
  console.log("\n----------------------------\n");
}


// -----------------------------------------------------------------------------
// RUN
// -----------------------------------------------------------------------------

// Call the main function.
// .catch() handles any unhandled errors (network failures, bad API key, etc.)
// and prints a clear message instead of a raw stack trace.
main().catch((error) => {
  console.error("An error occurred:", error.message);
  process.exit(1);
});
