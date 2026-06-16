// playwright.config.js
// Playwright runs e2e tests against a real browser with the full app running.
// The webServer block starts both Express and Vite before the tests begin,
// so you don't need to manually run `npm run dev` first.

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Run tests one at a time — avoids port conflicts and race conditions
  workers: 1,
  // Take a screenshot and save a trace on failure so you can debug visually
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    // Grant mic permission up front so tests don't block on the permission dialog
    permissions: ["microphone"],
  },
  webServer: [
    {
      // Start the Express backend first
      command: "node server.js",
      port: 3000,
      env: { NODE_ENV: "test" },
      reuseExistingServer: !process.env.CI,
    },
    {
      // Then start the Vite dev server
      command: "npx vite",
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
