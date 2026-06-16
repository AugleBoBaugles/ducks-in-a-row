// vitest.config.js
// Separate config for Vitest so it runs from the project root and finds
// the tests/ directory — not from client/ like vite.config.js does.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: ".",
    include: ["tests/**/*.test.js"],
    environment: "node",
  },
});
