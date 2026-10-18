/**
 * The ONE place that talks to a language model.
 *
 * REDcowork (WEB_APP mode) provides real model calls on the backend through
 * guard_sdk/ai (ai.chat). The platform does not allow calling a provider from
 * the browser, hand-written HTTP to a provider, or vendor SDKs. If the real
 * guard_sdk/ai signature differs from the guess below, change only
 * createPlatformChat(); everything else depends on the Chat type.
 */
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type Chat = (messages: ChatMessage[], options: { signal?: AbortSignal }) => Promise<{ text: string; model?: string }>;
export type LlmEngine = { kind: "platform" | "stand-in"; chat: Chat } | { kind: "unavailable"; reason: string };

function textOf(result: unknown): string {
  if (typeof result === "string") return result;
  const r = result as Record<string, any> | null;
  return r?.content ?? r?.text ?? r?.message?.content ?? r?.choices?.[0]?.message?.content ?? r?.data?.content ?? "";
}

export async function createPlatformChat(): Promise<LlmEngine> {
  const moduleName = "guard_sdk/ai";
  try {
    const mod: any = await import(/* @vite-ignore */ moduleName);
    const ai = mod.ai ?? mod.default ?? mod;
    if (typeof ai?.chat !== "function") return { kind: "unavailable", reason: "guard_sdk/ai has no chat()" };
    const chat: Chat = async (messages, { signal }) => {
      // temperature 0: retrieval should be repeatable, not creative.
      const result = await ai.chat({ messages, temperature: 0, signal });
      return { text: textOf(result), model: (result as any)?.model };
    };
    return { kind: "platform", chat };
  } catch (error) {
    return { kind: "unavailable", reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Local development only (MIBLY_STAND_IN=1). Answers with the deterministic
 * keyword engine so the plumbing can be tested without a model. Responses are
 * labeled mode "local" end to end, so it can never pass as AI in the UI.
 */
export function createStandIn(answer: (userMessage: string) => string): LlmEngine {
  return { kind: "stand-in", chat: async messages => ({ text: answer(messages.at(-1)?.content ?? ""), model: "stand-in (keyword rules)" }) };
}
