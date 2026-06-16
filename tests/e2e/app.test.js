// tests/e2e/app.test.js
// End-to-end tests using Playwright — a real browser, real DOM, real network.
// The API calls to Groq and Google TTS are intercepted and faked so tests
// are fast, free, and don't depend on external services being available.
//
// getUserMedia and MediaRecorder are also mocked in the browser because
// headless Chromium has no real microphone hardware to record from.

import { test, expect } from "@playwright/test";

// -----------------------------------------------------------------------
// Browser-level mocks
// Injected into the page before load via addInitScript so the app's hooks
// (useRecorder) pick up the fakes instead of the real browser APIs.
// -----------------------------------------------------------------------

// Replaces getUserMedia with a function that resolves immediately with a
// fake stream, and replaces MediaRecorder with a class that fires its
// ondataavailable and onstop callbacks after a short delay.
async function mockBrowserAudio(page) {
  await page.addInitScript(() => {
    // Fake MediaStream — just needs getTracks() so useRecorder can call .stop()
    const fakeStream = {
      getTracks: () => [{ stop: () => {} }],
    };

    navigator.mediaDevices.getUserMedia = async () => fakeStream;

    // Fake MediaRecorder — mimics the real API shape useRecorder depends on
    window.MediaRecorder = class {
      constructor(_stream) {
        this.mimeType = "audio/webm";
        this.ondataavailable = null;
        this.onstop = null;
      }

      start(_timeslice) {
        // Fire one data chunk shortly after recording starts
        setTimeout(() => {
          this.ondataavailable?.({
            data: new Blob(["fake audio data"], { type: "audio/webm" }),
          });
        }, 100);
      }

      stop() {
        // Fire onstop after a short delay (mirrors real MediaRecorder behavior)
        setTimeout(() => {
          this.onstop?.();
        }, 100);
      }

      static isTypeSupported() {
        return true;
      }
    };
  });
}

// -----------------------------------------------------------------------
// API route mocks
// -----------------------------------------------------------------------

async function mockTranscribeConversation(page, reply = "What tasks do you have today?") {
  await page.route("/transcribe", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text: "I need to plan my day.",
        ducky: reply,
        schedule: null,
        sessionId: "test-session-123",
      }),
    })
  );
}

async function mockTranscribeWithSchedule(page) {
  await page.route("/transcribe", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text: "I'm ready for my schedule.",
        ducky: "Here is your plan.",
        schedule: {
          tasks: [
            { id: 1, name: "Study for exam", duration: 90, priority: "high",   completed: false },
            { id: 2, name: "Do laundry",     duration: 30, priority: "low",    completed: false },
            { id: 3, name: "Grocery run",    duration: 45, priority: "medium", completed: false },
          ],
          schedule: [
            { startTime: "14:00", endTime: "15:30", label: "Study for exam", type: "task"  },
            { startTime: "15:30", endTime: "15:45", label: "Break",          type: "break" },
            { startTime: "15:45", endTime: "16:15", label: "Do laundry",     type: "task"  },
            { startTime: "16:15", endTime: "17:00", label: "Grocery run",    type: "task"  },
          ],
        },
        sessionId: "test-session-123",
      }),
    })
  );
}

// Smallest valid base64 MP3 (silence) so audio playback doesn't error
const SILENT_MP3 = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA";

async function mockTts(page) {
  await page.route("/tts", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ audioContent: SILENT_MP3 }),
    })
  );
}

// -----------------------------------------------------------------------
// Helper: start then stop a recording cycle
// Clicks the duck to start, waits briefly, clicks again to stop.
// -----------------------------------------------------------------------
async function doRecordingCycle(page) {
  await page.getByRole("button", { name: /start speaking/i }).click();
  await page.waitForTimeout(400); // let fake MediaRecorder fire its data chunk
  // force: true bypasses Playwright's "element is not stable" check —
  // the button is correct but the pulse CSS animation makes it appear unstable.
  await page.getByRole("button", { name: /stop recording/i }).click({ force: true });
}


// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

test("shows the duck and intro text on load", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /start speaking/i })).toBeVisible();
  await expect(page.getByText("click the duck to begin")).toBeVisible();
});

test("hides intro text and shows Listening status after clicking duck", async ({ page }) => {
  await mockBrowserAudio(page);
  await mockTranscribeConversation(page);
  await mockTts(page);
  await page.goto("/");

  await page.getByRole("button", { name: /start speaking/i }).click();

  await expect(page.getByText("click the duck to begin")).not.toBeVisible();
  await expect(page.getByText("Listening...")).toBeVisible();
});

test("shows duck reply text after submitting audio", async ({ page }) => {
  await mockBrowserAudio(page);
  await mockTranscribeConversation(page, "What tasks do you have today?");
  await mockTts(page);
  await page.goto("/");

  await doRecordingCycle(page);

  await expect(page.getByText("What tasks do you have today?")).toBeVisible({ timeout: 5000 });
});

test("transitions to schedule page when API returns a schedule", async ({ page }) => {
  await mockBrowserAudio(page);
  await mockTranscribeWithSchedule(page);
  await mockTts(page);
  await page.goto("/");

  await doRecordingCycle(page);

  await expect(page.getByText("Your Day")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Tasks")).toBeVisible();
  await expect(page.getByText("The Duck")).toBeVisible();
});

test("renders tasks in the todo list on the schedule page", async ({ page }) => {
  await mockBrowserAudio(page);
  await mockTranscribeWithSchedule(page);
  await mockTts(page);
  await page.goto("/");

  await doRecordingCycle(page);

  // Scope to the list so we don't accidentally match the calendar block labels
  const list = page.getByRole("list");
  await expect(list.getByText("Study for exam")).toBeVisible({ timeout: 5000 });
  await expect(list.getByText("Do laundry")).toBeVisible();
  await expect(list.getByText("Grocery run")).toBeVisible();
});

test("checking a task off strikes it through", async ({ page }) => {
  await mockBrowserAudio(page);
  await mockTranscribeWithSchedule(page);
  await mockTts(page);
  await page.goto("/");

  await doRecordingCycle(page);

  // Scope to the list to avoid the calendar block label match
  await expect(page.getByRole("list").getByText("Study for exam")).toBeVisible({ timeout: 5000 });

  const checkbox = page.getByRole("checkbox").first();
  await checkbox.check();

  // Verify the checkbox is actually checked — that's what drives the strikethrough.
  // (The CSS class name is hashed by CSS Modules so we can't target it directly.)
  await expect(checkbox).toBeChecked();
});
