// tests/unit/transcription.test.js
// Unit tests for the Groq Whisper transcription service.
// The Groq SDK is mocked so no real API calls are made.

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock the groq-sdk before importing the service ---
// vi.mock replaces the entire module with our fake version.
// The factory function returns a mock Groq class whose
// audio.transcriptions.create() method we can control per test.
const mockCreate = vi.fn();
vi.mock("groq-sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: mockCreate,
      },
    },
  })),
}));

// Import after mocking so the service picks up the fake SDK
const { transcribeAudio } = await import("../../services/transcription.js");

describe("transcribeAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the transcribed text from the API response", async () => {
    mockCreate.mockResolvedValue({ text: "I need to study for my exam." });

    const result = await transcribeAudio(
      Buffer.from("fake audio"),
      "recording.webm",
      "audio/webm"
    );

    expect(result).toBe("I need to study for my exam.");
  });

  it("calls the API with the correct model and language", async () => {
    mockCreate.mockResolvedValue({ text: "hello" });

    await transcribeAudio(Buffer.from("audio"), "test.webm", "audio/webm");

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("whisper-large-v3-turbo");
    expect(callArgs.language).toBe("en");
    expect(callArgs.response_format).toBe("json");
  });

  it("throws when the API call fails", async () => {
    mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

    await expect(
      transcribeAudio(Buffer.from("audio"), "test.webm", "audio/webm")
    ).rejects.toThrow("API rate limit exceeded");
  });
});
