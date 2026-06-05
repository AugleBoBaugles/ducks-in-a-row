// =============================================================================
// public/app.js
// =============================================================================
// Main frontend logic. Handles the duck button, wires up the AudioRecorder,
// sends audio to the server, and updates the UI with results.
//
// This file uses ES Module syntax (import/export) — it's loaded in index.html
// with <script type="module" src="app.js">, which means:
//   - It runs after the DOM is fully parsed (automatically deferred)
//   - It can use import statements
//   - It has its own scope (variables here don't pollute window)
// =============================================================================

import { AudioRecorder } from './recorder.js';


// -----------------------------------------------------------------------------
// DOM REFERENCES
// Grab all the elements we'll need to read from or update.
// -----------------------------------------------------------------------------
const duckBtn         = document.getElementById('duckBtn');
const duckLabel       = document.getElementById('duckLabel');
const timerEl         = document.getElementById('timer');
const statusEl        = document.getElementById('status');
const resultBox       = document.getElementById('resultBox');
const transcriptionEl = document.getElementById('transcriptionText');
const duckyBox        = document.getElementById('duckyBox');
const duckyEl         = document.getElementById('duckyText');


// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

// Maximum recording length in seconds. The timer counts down from this.
const MAX_SECONDS = 60;


// -----------------------------------------------------------------------------
// STATE
// -----------------------------------------------------------------------------

// The active AudioRecorder instance. Null when not recording.
let recorder = null;

// True while the microphone is actively recording.
// Used to determine what the duck button click should do.
let isRecording = false;


// -----------------------------------------------------------------------------
// BROWSER SUPPORT CHECK
// Run this before anything else. If MediaRecorder isn't available, disable the
// button and tell the user rather than failing silently later.
// -----------------------------------------------------------------------------
if (!AudioRecorder.isSupported()) {
  showError('Your browser does not support audio recording. Try Chrome or Firefox.');
  duckBtn.disabled = true;
}


// -----------------------------------------------------------------------------
// DUCK BUTTON — click handler
// Toggles between starting and stopping a recording.
// -----------------------------------------------------------------------------
duckBtn.addEventListener('click', async () => {
  if (isRecording) {
    await stopAndTranscribe();
  } else {
    await startRecording();
  }
});


// -----------------------------------------------------------------------------
// startRecording()
// Asks for mic permission and begins capturing audio.
// -----------------------------------------------------------------------------
async function startRecording() {
  try {
    // Flip state first so the UI updates immediately.
    isRecording = true;

    // Visual: switch the button to "recording" mode (pulsing animation, red tint)
    duckBtn.classList.add('recording');
    duckLabel.textContent = 'Click to stop';
    timerEl.textContent = formatTime(MAX_SECONDS);
    timerEl.classList.remove('urgent');

    // Clear any previous results and status messages.
    statusEl.textContent = '';
    statusEl.className = '';
    resultBox.classList.add('hidden');
    duckyBox.classList.add('hidden');

    // Create a new recorder with callbacks for the timer and auto-stop.
    recorder = new AudioRecorder({
      maxSeconds: MAX_SECONDS,

      // onTick fires every second. Update the countdown display.
      onTick: (elapsed) => {
        const remaining = MAX_SECONDS - elapsed;
        timerEl.textContent = formatTime(remaining);

        // Turn the timer red in the final 10 seconds as a warning.
        if (remaining <= 10) {
          timerEl.classList.add('urgent');
        }
      },

      // onAutoStop fires when the time limit is reached.
      // We call the same stopAndTranscribe() as a manual stop.
      onAutoStop: () => stopAndTranscribe(),
    });

    // start() calls getUserMedia — this is where the browser shows its
    // permission popup. If the user denies it, this throws NotAllowedError.
    await recorder.start();

  } catch (err) {
    // Reset state on failure.
    isRecording = false;
    duckBtn.classList.remove('recording');
    duckLabel.textContent = 'Click to start recording';
    timerEl.textContent = '';

    if (err.name === 'NotAllowedError') {
      showError('Microphone access denied — please allow mic access and try again.');
    } else {
      showError('Could not start recording: ' + err.message);
    }
  }
}


// -----------------------------------------------------------------------------
// stopAndTranscribe()
// Stops the recorder, sends the audio blob to the server, and shows results.
// Safe to call from both the button click AND the auto-stop timer.
// -----------------------------------------------------------------------------
async function stopAndTranscribe() {
  // Guard: if isRecording is already false, a stop is already in progress.
  // (This can happen if auto-stop and a button click fire at nearly the same time.)
  if (!isRecording) return;
  isRecording = false;

  // Visual: exit recording mode, disable button while we process.
  duckBtn.classList.remove('recording');
  duckBtn.disabled = true;
  duckLabel.textContent = 'Processing…';
  timerEl.textContent = '';
  timerEl.classList.remove('urgent');

  // Stop the recorder. This returns a Promise that resolves with the audio Blob
  // once MediaRecorder has flushed all buffered data.
  const audioBlob = await recorder.stop();

  // Sanity check: a zero-byte blob means no audio was captured.
  if (!audioBlob || audioBlob.size === 0) {
    showError('Recording was empty — please try again.');
    resetDuckBtn();
    return;
  }

  statusEl.textContent = 'Transcribing and consulting the rubber ducky…';
  statusEl.className = '';

  // -------------------------------------------------------------------------
  // BUILD THE REQUEST
  // FormData assembles a multipart/form-data body — the same format the server's
  // Multer middleware expects.
  // -------------------------------------------------------------------------
  const formData = new FormData();

  // Determine the file extension from the blob's MIME type so the server
  // (and Groq) can identify the audio format correctly.
  // Chrome produces audio/webm, Firefox produces audio/ogg.
  const ext = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
  formData.append('audio', audioBlob, `recording.${ext}`);

  // -------------------------------------------------------------------------
  // SEND TO SERVER
  // -------------------------------------------------------------------------
  try {
    const response = await fetch('/transcribe', {
      method: 'POST',
      body: formData, // Content-Type is set automatically by the browser
    });

    // Parse the JSON response. Server always returns { text, ducky } or { error }.
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    // Show results.
    statusEl.textContent = '';

    transcriptionEl.textContent = data.text;
    resultBox.classList.remove('hidden');

    duckyEl.textContent = data.ducky;
    duckyBox.classList.remove('hidden');

  } catch (err) {
    showError('Error: ' + err.message);
  } finally {
    // Re-enable the button whether we succeeded or failed.
    resetDuckBtn();
  }
}


// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

// Converts a number of seconds to a MM:SS string, e.g. 65 → "01:05".
// padStart(2, '0') ensures single-digit values get a leading zero.
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Resets the duck button to its default idle state.
function resetDuckBtn() {
  duckBtn.disabled = false;
  duckLabel.textContent = 'Click to start recording';
}

// Displays a red error message in the status element.
function showError(message) {
  statusEl.textContent = message;
  statusEl.className = 'error';
}
