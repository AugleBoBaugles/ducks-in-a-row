// vite.config.js
// Vite is the build tool / dev server for the React frontend.
//
// The proxy section is the key piece: in development, Vite runs on port 5173
// but the Express API runs on port 3000. Without a proxy, the browser would
// get CORS errors when the React app tries to call /transcribe or /tts.
// The proxy forwards any request starting with /transcribe or /tts to Express.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",   // client/ is the root (this file lives here)
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Express backend
      "/transcribe": "http://localhost:3000",
      "/tts":        "http://localhost:3000",
    },
  },
  build: {
    // Output to client/dist — Express serves this in production
    outDir: "dist",
  },
});
