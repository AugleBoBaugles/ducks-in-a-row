// tests/unit/transcription.test.js
// Unit tests for the Groq Whisper transcription service.
// The Groq SDK is mocked so no real API calls are made.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

// The service imports both the Groq class and a `toFile` helper from groq-sdk.
// We use importOriginal to keep the real toFile (it just wraps a buffer, no API call)
// and only replace the Groq constructor to intercept API calls.
vi.mock("groq-sdk", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: vi.fn(function () {
      this.audio = {
        transcriptions: { create: mockCreate },
      };
    }),
  };
});

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
