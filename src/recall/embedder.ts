import { WordPieceTokenizer } from "./tokenizer.ts";
import type { Embed } from "./semantic.ts";

/** The subset of onnxruntime (web or node) this module needs. */
type OrtLike = {
  Tensor: new (type: "int64", data: BigInt64Array, dims: number[]) => unknown;
  InferenceSession: { create(model: Uint8Array, options?: Record<string, unknown>): Promise<{ run(feeds: Record<string, unknown>): Promise<Record<string, { data: unknown; dims: readonly number[] }>> }> };
};

export async function createOrtEmbedder(ort: OrtLike, model: Uint8Array, vocabText: string, options: Record<string, unknown> = {}): Promise<Embed> {
  const tokenizer = new WordPieceTokenizer(vocabText);
  const session = await ort.InferenceSession.create(model, { graphOptimizationLevel: "all", ...options });
  return async (texts, signal) => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const encoded = texts.map(text => tokenizer.encode(text, 128));
    const width = Math.max(...encoded.map(item => item.ids.length));
    const ids = new BigInt64Array(texts.length * width);
    const mask = new BigInt64Array(texts.length * width);
    encoded.forEach((item, row) => item.ids.forEach((id, col) => { ids[row * width + col] = BigInt(id); mask[row * width + col] = 1n; }));
    const dims = [texts.length, width];
    const output = await session.run({
      input_ids: new ort.Tensor("int64", ids, dims),
      attention_mask: new ort.Tensor("int64", mask, dims),
      token_type_ids: new ort.Tensor("int64", new BigInt64Array(texts.length * width), dims),
    });
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    // sentence_embedding = L2-normalized [CLS] vector (bge pooling), shape [batch, 512].
    const out = output.sentence_embedding;
    const data = out.data as Float32Array, size = out.dims[1];
    return texts.map((_, row) => data.slice(row * size, (row + 1) * size));
  };
}
