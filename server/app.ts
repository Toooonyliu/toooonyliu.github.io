import express from "express";
import { RecallError, runRecall } from "./recall-service.ts";
import type { LlmEngine } from "./llm.ts";

/**
 * Express app in the REDcowork template shape:
 *   /health, /healthz          health checks (health.sh probes /health on loopback)
 *   GET  /api/recall/health    which engine is connected (UI status label)
 *   POST /api/recall           "找那一餐": model step runs here, never in the browser
 *   everything else            static files from static/ (mounted LAST)
 * Routes are mounted at the app root; the Guard proxy strips /f/<id>/ or /s/<id>/.
 */
export function createApp(engine: LlmEngine, staticDir: string) {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "300kb" }));

  app.get(["/health", "/healthz"], (_req, res) => { res.json({ status: "ok" }); });
  app.get("/api/recall/health", (_req, res) => { res.json({ engine: engine.kind }); });

  app.post("/api/recall", async (req, res) => {
    if (engine.kind === "unavailable") { res.status(503).json({ error: "model_unavailable" }); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18_000);
    res.on("close", () => { if (!res.writableEnded) controller.abort(); });
    try {
      const out = await runRecall(req.body ?? {}, engine, controller.signal);
      // Metadata only; the user's question is not logged unless MIBLY_DEBUG=1.
      console.info(`[recall] ${out.result.status} matches=${out.result.matches.length} dropped=${out.meta.dropped} candidates=${out.meta.candidates} ${out.meta.elapsedMs}ms`);
      res.json(out);
    } catch (error) {
      const code = error instanceof RecallError ? error.code : controller.signal.aborted ? "timeout" : "model_failed";
      console.warn("[recall] failed:", code, error instanceof Error ? error.message : error);
      if (!res.headersSent) res.status(code === "bad_request" ? 400 : code === "timeout" ? 504 : 502).json({ error: code });
    } finally {
      clearTimeout(timer);
    }
  });

  // Static frontend, mounted directly after all /api routes (no app.use("*") — it 301-loops).
  app.use(express.static(staticDir, { index: "index.html" }));
  return app;
}
