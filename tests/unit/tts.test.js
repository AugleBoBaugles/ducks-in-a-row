// tests/unit/tts.test.js
// Unit tests for the Google Cloud TTS service.
// fetch is mocked so no real API calls or billing occur.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the global fetch before importing the service
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set a fake API key so the missing-key guard doesn't fire
vi.stubEnv("GOOGLE_TTS_KEY", "fake-test-key");

const { synthesizeSpeech } = await import("../../services/tts.js");

// Helper — builds a fake successful fetch response
function mockOkResponse(body) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

describe("synthesizeSpeech", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the base64 audio content from the API", async () => {
    mockFetch.mockReturnValue(mockOkResponse({ audioContent: "base64encodedMP3==" }));

    const result = await synthesizeSpeech("Hello, I am the duck.");

    expect(result).toBe("base64encodedMP3==");
  });

  it("sends the correct voice and audio encoding", async () => {
    mockFetch.mockReturnValue(mockOkResponse({ audioContent: "abc" }));

    await synthesizeSpeech("Test message.");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.voice.name).toBe("en-US-Wavenet-D");
    expect(body.voice.languageCode).toBe("en-US");
    expect(body.audioConfig.audioEncoding).toBe("MP3");
  });

  it("includes the API key in the request URL", async () => {
    mockFetch.mockReturnValue(mockOkResponse({ audioContent: "abc" }));

    await synthesizeSpeech("Test.");

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("key=fake-test-key");
  });

  it("throws a descriptive error when the API returns a failure", async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: "API key invalid." } }),
        statusText: "Unauthorized",
      })
    );

    await expect(synthesizeSpeech("Hello.")).rejects.toThrow("API key invalid.");
  });

  it("throws when GOOGLE_TTS_KEY is not set", async () => {
    vi.stubEnv("GOOGLE_TTS_KEY", "");

    await expect(synthesizeSpeech("Hello.")).rejects.toThrow("GOOGLE_TTS_KEY");

    vi.stubEnv("GOOGLE_TTS_KEY", "fake-test-key"); // restore
  });
});
