import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// REDcowork serves the app under a runtime prefix (/f/<appId>/ preview,
// /s/<appId>/ online). base "./" keeps every asset URL relative to that prefix.
// Pure static build (REDcowork STATIC_SITE): site/ is the only folder the platform packages.
export default defineConfig({
  base: "./",
  build: {
    outDir: "site",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
  plugins: [react()],
});
