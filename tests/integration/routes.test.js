// tests/integration/routes.test.js
// Integration tests for the Express API routes.
// The service layer (Groq, Google TTS) is mocked at the module level so
// these tests verify that the routes wire everything together correctly
// without making real API calls.

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Mock the three service modules before importing the server ---
// This prevents any real API calls during tests.

vi.mock("../../services/transcription.js", () => ({
  transcribeAudio: vi.fn().mockResolvedValue("I need to study and do laundry."),
}));

vi.mock("../../services/rubberDucky.js", () => ({
  askRubberDucky: vi.fn().mockResolvedValue({
    reply: "What time do you want to start?",
    schedule: null,
  }),
}));

vi.mock("../../services/tts.js", () => ({
  synthesizeSpeech: vi.fn().mockResolvedValue("ZmFrZWF1ZGlv"), // fake base64
}));

// Import the mocked service functions so individual tests can override them
const { transcribeAudio } = await import("../../services/transcription.js");
const { askRubberDucky } = await import("../../services/rubberDucky.js");
const { synthesizeSpeech } = await import("../../services/tts.js");

// Import the Express app — the server file starts listening, but supertest
// handles port assignment automatically so there's no port conflict.
const { default: app } = await import("../../server.js");

// A minimal valid WAV file (44 bytes of header + silence) for upload tests
const FAKE_AUDIO = Buffer.from(
  "52494646" + "24000000" + "57415645" + "666d7420" +
  "10000000" + "01000100" + "44ac0000" + "88580100" +
  "02001000" + "64617461" + "00000000",
  "hex"
);

describe("POST /transcribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default happy-path return values after each test
    transcribeAudio.mockResolvedValue("I need to study and do laundry.");
    askRubberDucky.mockResolvedValue({ reply: "What time do you want to start?", schedule: null });
  });

  it("returns 400 when no audio file is uploaded", async () => {
    const res = await request(app).post("/transcribe");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns transcription and duck reply on success", async () => {
    const res = await request(app)
      .post("/transcribe")
      .attach("audio", FAKE_AUDIO, { filename: "recording.webm", contentType: "audio/webm" });

    expect(res.status).toBe(200);
    expect(res.body.text).toBe("I need to study and do laundry.");
    expect(res.body.ducky).toBe("What time do you want to start?");
    expect(res.body.schedule).toBeNull();
    expect(res.body.sessionId).toBeDefined();
  });

  it("returns a schedule object when the duck is ready", async () => {
    const fakeSchedule = {
      tasks: [{ id: 1, name: "Study", duration: 90, priority: "high", completed: false }],
      schedule: [{ startTime: "14:00", endTime: "15:30", label: "Study", type: "task" }],
    };
    askRubberDucky.mockResolvedValue({ reply: "Here is your plan.", schedule: fakeSchedule });

    const res = await request(app)
      .post("/transcribe")
      .attach("audio", FAKE_AUDIO, { filename: "recording.webm", contentType: "audio/webm" });

    expect(res.status).toBe(200);
    expect(res.body.schedule).toEqual(fakeSchedule);
  });

  it("maintains conversation history across requests with the same session ID", async () => {
    // First request — establishes the session
    const first = await request(app)
      .post("/transcribe")
      .set("X-Session-Id", "test-session-abc")
      .attach("audio", FAKE_AUDIO, { filename: "r.webm", contentType: "audio/webm" });

    expect(first.status).toBe(200);

    // Second request — same session ID
    await request(app)
      .post("/transcribe")
      .set("X-Session-Id", "test-session-abc")
      .attach("audio", FAKE_AUDIO, { filename: "r.webm", contentType: "audio/webm" });

    // The second call to askRubberDucky should have received a non-empty history
    const secondCallHistory = askRubberDucky.mock.calls[1][1];
    expect(secondCallHistory.length).toBeGreaterThan(0);
  });

  it("skips the LLM and returns a canned reply when audio is silent", async () => {
    transcribeAudio.mockResolvedValue(""); // Whisper returns empty on silence

    const res = await request(app)
      .post("/transcribe")
      .attach("audio", FAKE_AUDIO, { filename: "r.webm", contentType: "audio/webm" });

    expect(res.status).toBe(200);
    expect(res.body.ducky).toContain("catch");
    // LLM should NOT have been called
    expect(askRubberDucky).not.toHaveBeenCalled();
  });

  it("returns 500 when transcription throws", async () => {
    transcribeAudio.mockRejectedValue(new Error("Groq API down"));

    const res = await request(app)
      .post("/transcribe")
      .attach("audio", FAKE_AUDIO, { filename: "r.webm", contentType: "audio/webm" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Groq API down");
  });
});

describe("POST /tts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    synthesizeSpeech.mockResolvedValue("ZmFrZWF1ZGlv");
  });

  it("returns base64 audio content on success", async () => {
    const res = await request(app)
      .post("/tts")
      .send({ text: "Here is your plan for the day." });

    expect(res.status).toBe(200);
    expect(res.body.audioContent).toBe("ZmFrZWF1ZGlv");
  });

  it("returns 400 when text is missing", async () => {
    const res = await request(app).post("/tts").send({});
    expect(res.status).toBe(400);
  });

  it("returns 500 when TTS throws", async () => {
    synthesizeSpeech.mockRejectedValue(new Error("Google API key invalid"));

    const res = await request(app)
      .post("/tts")
      .send({ text: "Hello." });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Google API key invalid");
  });
});
