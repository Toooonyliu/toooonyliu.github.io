/**
 * The ONE place that talks to a language model.
 *
 * REDcowork WEB_APP provides the model through the platform SDK in
 * guard_sdk/ai.js (CommonJS, copied in by `guard`):
 *   chat(messages, { system, maxTokens, thinking }) -> Promise<string>
 * messages may only contain user/assistant turns; the system prompt is passed
 * separately. The SDK reads ai.properties itself; no key exists in this code.
 */
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type Chat = (messages: ChatMessage[], options: { signal?: AbortSignal }) => Promise<{ text: string; model?: string }>;
export type LlmEngine = { kind: "platform" | "stand-in"; chat: Chat } | { kind: "unavailable"; reason: string };

type GuardAi = {
  chat: (messages: { role: "user" | "assistant"; content: string }[], options?: { system?: string | null; maxTokens?: number; thinking?: boolean }) => Promise<string>;
  isAiEnabled?: () => boolean;
};

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new Error("aborted"));
  // The SDK has no cancellation hook; stop waiting when the request is abandoned.
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error("aborted"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(value => { signal.removeEventListener("abort", onAbort); resolve(value); },
      error => { signal.removeEventListener("abort", onAbort); reject(error); });
  });
}

/** Wraps the platform SDK module (the result of require("../guard_sdk/ai")). */
export function createGuardChat(ai: unknown): LlmEngine {
  const sdk = ai as GuardAi | null;
  if (!sdk || typeof sdk.chat !== "function") return { kind: "unavailable", reason: "guard_sdk/ai has no chat()" };
  if (typeof sdk.isAiEnabled === "function" && !sdk.isAiEnabled()) return { kind: "unavailable", reason: "AI is not configured (no ai.properties)" };
  const chat: Chat = async (messages, { signal }) => {
    const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n") || null;
    const turns = messages.filter((m): m is { role: "user" | "assistant"; content: string } => m.role !== "system");
    const text = await abortable(sdk.chat(turns, { system, maxTokens: 2000, thinking: false }), signal);
    return { text: typeof text === "string" ? text : String(text ?? "") };
  };
  return { kind: "platform", chat };
}

/**
 * Local development only (MIBLY_STAND_IN=1). Answers with the deterministic
 * keyword engine so the plumbing can be tested without a model. Responses are
 * labeled mode "local" end to end, so it can never pass as AI in the UI.
 */
export function createStandIn(answer: (userMessage: string) => string): LlmEngine {
  return { kind: "stand-in", chat: async messages => ({ text: answer(messages.at(-1)?.content ?? ""), model: "stand-in (keyword rules)" }) };
}
