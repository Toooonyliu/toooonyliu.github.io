import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { RecallError, runRecall, standInAnswer } from "./recall-service.ts";
import { createPlatformChat, createStandIn, type LlmEngine } from "./llm.ts";

/**
 * Minimal Express app for REDcowork WEB_APP mode:
 *   POST /api/recall          "找那一餐" (model step runs here, never in the browser)
 *   GET  /api/recall/health   which engine is connected, for the UI status label
 *   everything else           the built React app from dist/client
 * If the platform template already has an Express server, mount these two
 * routes there instead and keep server/recall-service.ts unchanged.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = express();
app.use(express.json({ limit: "300kb" }));

const enginePromise: Promise<LlmEngine> = process.env.MIBLY_STAND_IN === "1"
  ? Promise.resolve(createStandIn(standInAnswer))
  : createPlatformChat();
enginePromise.then(engine => console.log(`[recall] engine: ${engine.kind}${engine.kind === "unavailable" ? ` (${engine.reason})` : ""}`));

app.get("/api/recall/health", async (_req, res) => {
  const engine = await enginePromise;
  res.json({ engine: engine.kind });
});

app.post("/api/recall", async (req, res) => {
  const engine = await enginePromise;
  if (engine.kind === "unavailable") { res.status(503).json({ error: "model_unavailable" }); return; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  res.on("close", () => { if (!res.writableEnded) controller.abort(); });
  try {
    const out = await runRecall(req.body ?? {}, engine, controller.signal);
    // Metadata only; the user's question is not logged unless MIBLY_DEBUG=1.
    console.info(`[recall] ${out.result.status} matches=${out.result.matches.length} dropped=${out.meta.dropped} candidates=${out.meta.candidates} ${out.meta.elapsedMs}ms model=${out.meta.model ?? "?"}`);
    res.json(out);
  } catch (error) {
    const code = error instanceof RecallError ? error.code : controller.signal.aborted ? "timeout" : "model_failed";
    console.warn("[recall] failed:", code, error instanceof Error ? error.message : error);
    if (!res.headersSent) res.status(code === "bad_request" ? 400 : code === "timeout" ? 504 : 502).json({ error: code });
  } finally {
    clearTimeout(timer);
  }
});

app.use(express.static(path.join(root, "dist/client"), { index: false }));
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(root, "dist/client/index.html")));

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`[mibly] http://localhost:${port}`));
