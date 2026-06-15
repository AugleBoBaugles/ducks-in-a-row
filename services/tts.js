// =============================================================================
// services/tts.js
// =============================================================================
// Converts text to speech using the Google Cloud Text-to-Speech REST API.
// Returns base64-encoded MP3 audio that the browser can play directly.
//
// Requires env var: GOOGLE_TTS_KEY (a Google Cloud API key with TTS enabled)
//
// Voice choice: en-US-Wavenet-D — a deep, calm male voice that fits the
// duck's wise, unhurried Morgan Freeman-style persona.
// Other good options: en-US-Neural2-D (more natural), en-US-Studio-Q (premium)
//
// Exports:
//   synthesizeSpeech(text) → Promise<string>  (base64-encoded MP3)
// =============================================================================

const TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";


// -----------------------------------------------------------------------------
// synthesizeSpeech(text)
//
// Parameters:
//   text {string} — the text to speak aloud
//
// Returns:
//   {Promise<string>} — base64-encoded MP3 audio content
// -----------------------------------------------------------------------------
export async function synthesizeSpeech(text) {
  const apiKey = process.env.GOOGLE_TTS_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_TTS_KEY environment variable is not set.");
  }

  // Google TTS REST API expects a JSON body with three sections:
  //   input       — the text to speak
  //   voice       — language and voice model to use
  //   audioConfig — output format settings
  const response = await fetch(`${TTS_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: "en-US",
        name: "en-US-Wavenet-D", // deep, calm male voice
      },
      audioConfig: {
        audioEncoding: "MP3",
        // Slightly slower speaking rate suits the duck's measured, unhurried tone
        speakingRate: 0.9,
        // Slightly lower pitch to reinforce the wise, deep persona
        pitch: -2.0,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Google TTS error: ${err.error?.message || response.statusText}`);
  }

  // Google returns { audioContent: "<base64 MP3>" }
  const { audioContent } = await response.json();
  return audioContent;
}
