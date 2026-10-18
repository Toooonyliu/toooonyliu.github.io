/**
 * Production entry, bundled by scripts/build-server.mjs into app/server.js
 * (CommonJS, plain Node 18+, no TypeScript runtime needed on the Pod).
 * start.sh runs `exec node app/server.js`.
 */
import path from "node:path";
import { createApp } from "./app.ts";
import { createGuardChat, createStandIn, type LlmEngine } from "./llm.ts";
import { standInAnswer } from "./recall-service.ts";

declare const __dirname: string;
declare const require: (id: string) => unknown;

function loadEngine(): LlmEngine {
  if (process.env.MIBLY_STAND_IN === "1") return createStandIn(standInAnswer);
  try {
    // Resolved at runtime next to app/: /workspace/guard_sdk/ai.js (platform SDK).
    return createGuardChat(require("../guard_sdk/ai"));
  } catch (error) {
    return { kind: "unavailable", reason: error instanceof Error ? error.message : String(error) };
  }
}

const engine = loadEngine();
console.log(`[recall] engine: ${engine.kind}${engine.kind === "unavailable" ? ` (${engine.reason})` : ""}`);
const app = createApp(engine, path.resolve(__dirname, "..", "static"));
const port = parseInt(process.env.APP_PORT || "3000", 10);
const host = process.env.APP_HOSTNAME || "0.0.0.0";
app.listen(port, host, () => console.log(`listening on ${host}:${port}`));
