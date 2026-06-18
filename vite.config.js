// vite.config.js (project root)
// Vite build and dev server config for the React frontend.
//
// root: "client" tells Vite to treat client/ as the web root — so index.html,
// public/, and src/ are all found relative to client/.
//
// In dev, the proxy forwards /transcribe and /tts calls to the Express server
// on port 3000, avoiding CORS issues when the two servers run side by side.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "client",  // client/ is the frontend root
  server: {
    port: 5173,
    proxy: {
      "/transcribe": "http://localhost:3000",
      "/tts":        "http://localhost:3000",
      "/advice":     "http://localhost:3000",
    },
  },
  build: {
    // Build output goes to client/dist — Express serves this folder in production
    outDir: "dist",
  },
});
