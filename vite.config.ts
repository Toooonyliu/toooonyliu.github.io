import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// REDcowork serves the app under a runtime prefix (/f/<appId>/ preview,
// /s/<appId>/ online). base "./" keeps every asset URL relative to that prefix.
// The build goes to static/, which app/server.js serves (platform template layout).
export default defineConfig({
  base: "./",
  build: {
    outDir: "static",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
  plugins: [react()],
});
