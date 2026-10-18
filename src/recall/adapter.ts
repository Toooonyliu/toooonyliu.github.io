import { localDay } from "../data.ts";
import type { RecallRequest } from "./engine.ts";

/**
 * Browser side of "找那一餐". The language model runs on the server
 * (REDcowork WEB_APP, guard_sdk/ai). The browser sends the question and the
 * records it is showing; the server re-authorizes them against its own copy,
 * calls the model, verifies every ID and quote, and returns the result.
 * No key, prompt or provider call exists in this bundle.
 */
export type RecallMeta = { engine: "platform" | "stand-in" | "none"; model?: string; elapsedMs: number; candidates: number; dropped: number };
export type RecallNetwork = { friends: string[]; hidden: string[] };
export type EngineStatus = "checking" | "platform" | "stand-in" | "unavailable";

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");

export class RecallHttpError extends Error {
  constructor(readonly code: "model_unavailable" | "model_failed" | "timeout" | "bad_request" | "network", message: string = code) { super(message); }
}

export async function checkEngine(signal?: AbortSignal): Promise<EngineStatus> {
  try {
    const response = await fetch(`${BASE}api/recall/health`, { signal });
    if (!response.ok) return "unavailable";
    const body = await response.json() as { engine?: string };
    return body.engine === "platform" || body.engine === "stand-in" ? body.engine : "unavailable";
  } catch { return "unavailable"; }
}

export async function searchWithModel(request: RecallRequest, network: RecallNetwork, signal: AbortSignal): Promise<{ raw: unknown; meta: RecallMeta }> {
  let response: Response;
  try {
    response = await fetch(`${BASE}api/recall`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal,
      body: JSON.stringify({
        query: request.query, scope: request.scope, lang: request.lang, today: localDay(new Date()),
        // Photos are stripped before this point; the server rebuilds friends' records itself.
        records: request.records.map(({ photo: _photo, ...record }) => record),
        network,
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new RecallHttpError("network");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    const code = body.error === "model_unavailable" || body.error === "timeout" || body.error === "bad_request" ? body.error : "model_failed";
    throw new RecallHttpError(code);
  }
  const body = await response.json() as { result?: unknown; meta?: RecallMeta };
  return { raw: body.result, meta: body.meta ?? { engine: "none", elapsedMs: 0, candidates: 0, dropped: 0 } };
}
