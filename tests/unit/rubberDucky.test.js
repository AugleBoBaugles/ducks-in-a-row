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

// Helper — wraps a JSON-serialised string in the shape the Groq API returns.
// The model is in JSON mode so content is always a JSON string.
function mockReply(obj) {
  return { choices: [{ message: { content: JSON.stringify(obj) } }] };
}

describe("askRubberDucky", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the duck's reply text", async () => {
    mockCreate.mockResolvedValue(mockReply({ reply: "What tasks do you have today?", tasks: null, schedule: null }));

    const { reply } = await askRubberDucky("I need help planning my day.", []);

    expect(reply).toBe("What tasks do you have today?");
  });

  it("passes conversation history into the messages array", async () => {
    mockCreate.mockResolvedValue(mockReply({ reply: "Got it.", tasks: null, schedule: null }));

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

  it("requests json_object response format", async () => {
    mockCreate.mockResolvedValue(mockReply({ reply: "Got it.", tasks: null, schedule: null }));

    await askRubberDucky("Hello.", []);

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.response_format).toEqual({ type: "json_object" });
  });

  it("parses schedule and reply from a JSON response", async () => {
    const tasks = [{ id: 1, name: "Study", duration: 90, priority: "high", completed: false }];
    const schedule = [{ startTime: "14:00", endTime: "15:30", label: "Study", type: "task" }];

    mockCreate.mockResolvedValue(mockReply({ reply: "Here is your plan.", tasks, schedule }));

    const { reply, schedule: parsed } = await askRubberDucky("Ready for my plan.", []);

    expect(reply).toBe("Here is your plan.");
    expect(parsed).not.toBeNull();
    expect(parsed.tasks[0].name).toBe("Study");
    expect(parsed.schedule[0].startTime).toBe("14:00");
  });

  it("returns null for schedule when tasks and schedule are null", async () => {
    mockCreate.mockResolvedValue(
      mockReply({ reply: "How much time do you have available today?", tasks: null, schedule: null })
    );

    const { schedule } = await askRubberDucky("I have a few things to do.", []);

    expect(schedule).toBeNull();
  });

  it("falls back gracefully when the model returns non-JSON", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "Something went wrong" } }] });

    const { reply, schedule } = await askRubberDucky("Hello", []);

    expect(reply).toBe("Something went wrong");
    expect(schedule).toBeNull();
  });

  it("throws when the API call fails", async () => {
    mockCreate.mockRejectedValue(new Error("Model unavailable"));

    await expect(askRubberDucky("Hello", [])).rejects.toThrow("Model unavailable");
  });
});
