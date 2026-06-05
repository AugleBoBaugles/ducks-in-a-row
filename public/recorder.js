// =============================================================================
// public/recorder.js
// =============================================================================
// A self-contained module for recording audio from the user's microphone.
// Wraps the browser's MediaRecorder API into a simple, reusable class.
//
// Usage (in app.js):
//   import { AudioRecorder } from './recorder.js';
//
//   const recorder = new AudioRecorder({
//     maxSeconds: 60,
//     onTick: (elapsed) => console.log(elapsed),
//     onAutoStop: () => handleStop(),
//   });
//
//   await recorder.start();   // requests mic, begins recording
//   const blob = await recorder.stop(); // stops, returns audio as a Blob
// =============================================================================


export class AudioRecorder {

  // Private fields — the # prefix means these can only be accessed from inside
  // this class. This prevents outside code from accidentally breaking the state.
  #stream        = null;  // the live microphone MediaStream from getUserMedia
  #mediaRecorder = null;  // the MediaRecorder that encodes and chunks the audio
  #chunks        = [];    // array of audio data chunks collected during recording
  #timerId       = null;  // the setInterval ID for the elapsed-time counter
  #elapsed       = 0;     // seconds elapsed since recording started
  #stopped       = false; // guard to prevent stop() from running twice


  // ---------------------------------------------------------------------------
  // Constructor
  //
  // Options:
  //   maxSeconds  {number}    Max recording length before auto-stop (default 60)
  //   onTick      {function}  Called every second with (elapsedSeconds)
  //   onAutoStop  {function}  Called when maxSeconds is reached
  // ---------------------------------------------------------------------------
  constructor({ maxSeconds = 60, onTick = () => {}, onAutoStop = () => {} } = {}) {
    this.maxSeconds = maxSeconds;
    this.onTick     = onTick;
    this.onAutoStop = onAutoStop;
  }


  // ---------------------------------------------------------------------------
  // start()
  // Requests microphone access, sets up the MediaRecorder, and begins recording.
  // Returns a Promise that resolves once recording has started.
  // Throws if the user denies microphone permission.
  // ---------------------------------------------------------------------------
  async start() {
    this.#stopped = false;
    this.#chunks  = [];
    this.#elapsed = 0;

    // navigator.mediaDevices.getUserMedia() asks the browser to access the mic.
    // The browser shows its own permission popup. If the user clicks "Deny",
    // this throws a NotAllowedError — the caller (app.js) should catch that.
    this.#stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // MediaRecorder wraps the live audio stream and encodes it to a file format.
    // The browser automatically picks a supported codec (usually webm/opus in
    // Chrome, ogg/opus in Firefox).
    this.#mediaRecorder = new MediaRecorder(this.#stream);

    // ondataavailable fires every `timeslice` milliseconds (set in .start(250)
    // below). Each event gives us a chunk of encoded audio. We collect them all
    // in an array and assemble them into one blob when recording stops.
    this.#mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.#chunks.push(event.data);
      }
    };

    // Begin recording, emitting a data chunk every 250ms.
    // A smaller timeslice means we lose less audio if stop() is called abruptly.
    this.#mediaRecorder.start(250);

    // Start counting elapsed seconds. onTick lets the UI update the timer.
    // When we hit maxSeconds, call onAutoStop so the app can stop + send.
    this.#timerId = setInterval(() => {
      this.#elapsed++;
      this.onTick(this.#elapsed);

      if (this.#elapsed >= this.maxSeconds && !this.#stopped) {
        this.onAutoStop();
      }
    }, 1000);
  }


  // ---------------------------------------------------------------------------
  // stop()
  // Stops the recording and returns a Promise that resolves with the audio Blob.
  // Safe to call multiple times — subsequent calls are ignored.
  // ---------------------------------------------------------------------------
  stop() {
    // Guard: if already stopped (e.g. auto-stop fired and user also clicked stop),
    // return null so the caller knows there's nothing to process.
    if (this.#stopped) return Promise.resolve(null);
    this.#stopped = true;

    // Stop the elapsed-time ticker immediately so onAutoStop doesn't fire again.
    clearInterval(this.#timerId);

    return new Promise((resolve) => {

      // onstop fires after MediaRecorder finishes flushing its internal buffers.
      // This is where we get the final audio chunk and assemble everything.
      this.#mediaRecorder.onstop = () => {

        // Release the microphone. Without this, the browser keeps showing the
        // red "recording" indicator in the tab even after we've stopped.
        this.#stream.getTracks().forEach((track) => track.stop());

        // Combine all the chunks into one Blob.
        // We use the mimeType that MediaRecorder actually used (e.g. "audio/webm;codecs=opus")
        // so the Blob has the correct format metadata.
        const blob = new Blob(this.#chunks, { type: this.#mediaRecorder.mimeType });

        resolve(blob);
      };

      // Tell MediaRecorder to stop. This triggers one final ondataavailable,
      // then fires onstop.
      this.#mediaRecorder.stop();
    });
  }


  // ---------------------------------------------------------------------------
  // isSupported() — static utility
  // Call this before instantiating to check if the browser supports recording.
  // ---------------------------------------------------------------------------
  static isSupported() {
    return (
      typeof MediaRecorder !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    );
  }
}
