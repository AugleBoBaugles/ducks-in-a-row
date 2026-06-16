// tests/unit/rubberDucky.test.js
// Unit tests for the scheduling LLM service.
// Verifies conversation history handling, schedule JSON parsing,
// and graceful handling of replies with no schedule yet.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

// Mock groq-sdk with a proper constructor (regular function, not arrow)
// because the service instantiates it with `new Groq()`.
vi.mock("groq-sdk", () => ({
  default: vi.fn(function () {
    this.chat = {
      completions: { create: mockCreate },
    };
  }),
}));

const { askRubberDucky } = await import("../../services/rubberDucky.js");

// Helper — wraps a string in the shape the Groq API returns
function mockReply(content) {
  return { choices: [{ message: { content } }] };
}

describe("askRubberDucky", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the duck's reply text", async () => {
    mockCreate.mockResolvedValue(mockReply("What tasks do you have today?"));

    const { reply } = await askRubberDucky("I need help planning my day.", []);

    expect(reply).toBe("What tasks do you have today?");
  });

  it("passes conversation history into the messages array", async () => {
    mockCreate.mockResolvedValue(mockReply("Got it."));

    const history = [
      { role: "user",      content: "I have three tasks." },
      { role: "assistant", content: "What are they?" },
    ];

    await askRubberDucky("Study, laundry, and groceries.", history);

    const messages = mockCreate.mock.calls[0][0].messages;
    const contents = messages.map((m) => m.content);
    expect(contents).toContain("I have three tasks.");
    expect(contents).toContain("What are they?");
    expect(contents).toContain("Study, laundry, and groceries.");
  });

  it("parses schedule JSON from the reply and strips it from the text", async () => {
    const schedule = {
      tasks: [{ id: 1, name: "Study", duration: 90, priority: "high", completed: false }],
      schedule: [{ startTime: "14:00", endTime: "15:30", label: "Study", type: "task" }],
    };

    const rawReply = `Here is your plan.\n\`\`\`json\n${JSON.stringify(schedule)}\n\`\`\``;
    mockCreate.mockResolvedValue(mockReply(rawReply));

    const { reply, schedule: parsed } = await askRubberDucky("Ready for my plan.", []);

    // JSON block should be removed from the spoken reply
    expect(reply).toBe("Here is your plan.");
    expect(reply).not.toContain("```json");

    // Schedule object should be parsed correctly
    expect(parsed).not.toBeNull();
    expect(parsed.tasks[0].name).toBe("Study");
    expect(parsed.schedule[0].startTime).toBe("14:00");
  });

  it("returns null for schedule when the duck is still asking questions", async () => {
    mockCreate.mockResolvedValue(
      mockReply("How much time do you have available today?")
    );

    const { schedule } = await askRubberDucky("I have a few things to do.", []);

    expect(schedule).toBeNull();
  });

  it("throws when the API call fails", async () => {
    mockCreate.mockRejectedValue(new Error("Model unavailable"));

    await expect(askRubberDucky("Hello", [])).rejects.toThrow("Model unavailable");
  });
});
