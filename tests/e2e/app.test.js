// tests/e2e/app.test.js
// End-to-end tests using Playwright — a real browser, real DOM, real network.
// The API calls to Groq and Google TTS are intercepted and faked so tests
// are fast, free, and don't depend on external services being available.

import { test, expect } from "@playwright/test";

// -----------------------------------------------------------------------
// Helpers for faking API responses in the browser
// -----------------------------------------------------------------------

// Intercepts POST /transcribe and returns a canned duck reply with no schedule.
// Use this for tests that just need to verify the conversation UI works.
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

// Intercepts POST /transcribe and returns a full schedule so the app transitions
// to the SchedulePage. Use this to test the plan view.
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
            { id: 1, name: "Study for exam",  duration: 90, priority: "high",   completed: false },
            { id: 2, name: "Do laundry",      duration: 30, priority: "low",    completed: false },
            { id: 3, name: "Grocery run",     duration: 45, priority: "medium", completed: false },
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

// Intercepts POST /tts and returns a tiny valid base64 MP3 so audio plays
// without hitting Google's API.
async function mockTts(page) {
  // Smallest valid MP3 header (silence) encoded as base64
  const silentMp3 = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA";
  await page.route("/tts", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ audioContent: silentMp3 }),
    })
  );
}


// -----------------------------------------------------------------------
// ConversationPage tests
// -----------------------------------------------------------------------

test("shows the duck and intro text on load", async ({ page }) => {
  await page.goto("/");

  // The duck image should be visible
  const duck = page.getByRole("button", { name: /start speaking|consult/i });
  await expect(duck).toBeVisible();

  // The intro prompt should be visible before the user interacts
  await expect(page.getByText("click the duck to begin")).toBeVisible();
});

test("hides intro text and shows status after clicking the duck", async ({ page }) => {
  await mockTranscribeConversation(page);
  await mockTts(page);
  await page.goto("/");

  // Grant mic permission and click the duck to start recording
  await page.getByRole("button", { name: /start speaking/i }).click();

  // Intro text should disappear after the first click
  await expect(page.getByText("click the duck to begin")).not.toBeVisible();

  // Status line should indicate recording
  await expect(page.getByText("Listening...")).toBeVisible();
});

test("shows duck reply text after submitting audio", async ({ page }) => {
  await mockTranscribeConversation(page, "What tasks do you have today?");
  await mockTts(page);
  await page.goto("/");

  // Start recording
  await page.getByRole("button", { name: /start speaking/i }).click();
  await page.waitForTimeout(300);

  // Stop recording (click again)
  await page.getByRole("button", { name: /stop recording/i }).click();

  // Duck reply should appear
  await expect(page.getByText("What tasks do you have today?")).toBeVisible({ timeout: 5000 });
});


// -----------------------------------------------------------------------
// SchedulePage tests
// -----------------------------------------------------------------------

test("transitions to schedule page when API returns a schedule", async ({ page }) => {
  await mockTranscribeWithSchedule(page);
  await mockTts(page);
  await page.goto("/");

  // Start then stop recording to trigger the API call
  await page.getByRole("button", { name: /start speaking/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /stop recording/i }).click();

  // Should see the three column headers
  await expect(page.getByText("Your Day")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Tasks")).toBeVisible();
  await expect(page.getByText("The Duck")).toBeVisible();
});

test("renders tasks in the todo list on the schedule page", async ({ page }) => {
  await mockTranscribeWithSchedule(page);
  await mockTts(page);
  await page.goto("/");

  await page.getByRole("button", { name: /start speaking/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /stop recording/i }).click();

  // All three tasks from the mock schedule should appear
  await expect(page.getByText("Study for exam")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Do laundry")).toBeVisible();
  await expect(page.getByText("Grocery run")).toBeVisible();
});

test("checking a task off strikes it through", async ({ page }) => {
  await mockTranscribeWithSchedule(page);
  await mockTts(page);
  await page.goto("/");

  await page.getByRole("button", { name: /start speaking/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /stop recording/i }).click();

  // Wait for the schedule page to appear
  await expect(page.getByText("Study for exam")).toBeVisible({ timeout: 5000 });

  // Click the checkbox next to "Study for exam"
  const checkbox = page.getByRole("checkbox").first();
  await checkbox.check();

  // The task label should now be struck through (has the CSS "done" class)
  const taskLabel = page.locator("span.done, s").first();
  await expect(taskLabel).toBeVisible();
});
