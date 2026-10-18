import { semanticRecall, warmRecords, type Embed } from "./semantic.ts";
import { createOrtEmbedder } from "./embedder.ts";
import type { RecallRecord, RecallRequest, RecallResponse } from "./engine.ts";

/**
 * "找那一餐" AI, fully in the browser (REDcowork only publishes pure-frontend
 * works). A Chinese retrieval model, bge-small-zh-v1.5 (int8 ONNX, ~24 MB),
 * runs through onnxruntime-web (WebAssembly). Model, vocabulary and runtime are
 * served from the same site: no API key, no server, no third-party CDN, and the
 * question and friends' posts never leave the device.
 */
export type ModelState =
  | { status: "idle" }
  | { status: "loading"; loaded: number; total: number }
  | { status: "ready"; loadMs: number }
  | { status: "error"; message: string };
export type RecallMeta = { engine: "on-device"; elapsedMs: number; candidates: number };

export const MODEL_INFO = {
  name: "bge-small-zh-v1.5",
  variant: "int8 ONNX · 512-d",
  runtime: "onnxruntime-web 1.27.0 (WebAssembly)",
  modelBytes: 23_937_398,
};
const BASE = (import.meta.env.BASE_URL || "./").replace(/\/?$/, "/");
const MODEL_DIR = `${BASE}models/bge-small-zh-v1.5/`;

let state: ModelState = { status: "idle" };
const listeners = new Set<(state: ModelState) => void>();
const setState = (next: ModelState) => { state = next; listeners.forEach(listener => listener(next)); };
export const getModelState = () => state;
export function subscribeModel(listener: (state: ModelState) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

async function fetchWithProgress(url: string, expected: number): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`model file ${response.status}`);
  // Static hosts may answer a missing file with index.html (200): reject non-binary responses.
  if ((response.headers.get("content-type") || "").includes("text/html")) throw new Error("model file missing");
  const total = Number(response.headers.get("content-length")) || expected;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); loaded += value.length;
    setState({ status: "loading", loaded, total });
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

let embedderPromise: Promise<Embed> | null = null;
/** Starts (or reuses) the one-time model download; called when the panel opens. */
export function loadModel(): Promise<Embed> {
  if (embedderPromise) return embedderPromise;
  const started = performance.now();
  setState({ status: "loading", loaded: 0, total: MODEL_INFO.modelBytes });
  embedderPromise = (async () => {
    if (typeof WebAssembly !== "object") throw new Error("WebAssembly unavailable");
    const [ort, model, vocab] = await Promise.all([
      import("onnxruntime-web/wasm"),
      fetchWithProgress(`${MODEL_DIR}model_int8.onnx`, MODEL_INFO.modelBytes),
      fetch(`${MODEL_DIR}vocab.txt`).then(r => { if (!r.ok || (r.headers.get("content-type") || "").includes("text/html")) throw new Error(`vocab ${r.status}`); return r.text(); }),
    ]);
    ort.env.wasm.numThreads = 1; // no cross-origin isolation on static hosts
    const embed = await createOrtEmbedder(ort, model, vocab, { executionProviders: ["wasm"] });
    await embed(["预热"]);
    setState({ status: "ready", loadMs: Math.round(performance.now() - started) });
    return embed;
  })().catch(error => {
    embedderPromise = null;
    setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
    throw error;
  });
  return embedderPromise;
}

/** Pre-computes record vectors while the user types, so the first search is fast. */
export async function warm(records: RecallRecord[]) {
  const embed = await loadModel();
  await warmRecords(records, embed);
}

export async function searchOnDevice(request: RecallRequest, signal: AbortSignal): Promise<{ raw: RecallResponse; meta: RecallMeta }> {
  const embed = await loadModel();
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const started = performance.now();
  const raw = await semanticRecall(request, embed, signal);
  return { raw, meta: { engine: "on-device", elapsedMs: Math.round(performance.now() - started), candidates: request.records.length } };
}
