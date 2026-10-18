/**
 * Minimal BERT WordPiece tokenizer for bge-small-zh-v1.5 (bert-base-chinese
 * vocabulary, lowercase). Pure function, no network: the vocabulary is loaded
 * by the caller from the self-hosted model folder.
 */
export type Encoded = { ids: number[]; mask: number[] };

const isControl = (code: number) => (code < 32 && code !== 9 && code !== 10 && code !== 13) || (code >= 127 && code < 160);
const isWhitespace = (ch: string) => /\s/u.test(ch);
const isCjk = (code: number) =>
  (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0x20000 && code <= 0x2a6df) ||
  (code >= 0x2a700 && code <= 0x2b73f) || (code >= 0x2b740 && code <= 0x2b81f) || (code >= 0x2b820 && code <= 0x2ceaf) ||
  (code >= 0xf900 && code <= 0xfaff) || (code >= 0x2f800 && code <= 0x2fa1f);
const isPunctuation = (ch: string, code: number) =>
  (code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126) || /\p{P}/u.test(ch);

export class WordPieceTokenizer {
  private vocab = new Map<string, number>();
  readonly cls: number; readonly sep: number; readonly unk: number;

  constructor(vocabText: string) {
    vocabText.split("\n").forEach((token, index) => { if (token && !this.vocab.has(token)) this.vocab.set(token, index); });
    this.cls = this.id("[CLS]"); this.sep = this.id("[SEP]"); this.unk = this.id("[UNK]");
  }
  private id(token: string): number {
    const value = this.vocab.get(token);
    if (value === undefined) throw new Error(`vocab is missing ${token}`);
    return value;
  }

  /** Basic tokenizer: clean, lowercase, strip accents, split CJK and punctuation. */
  basic(text: string): string[] {
    let spaced = "";
    for (const ch of text.normalize("NFC")) {
      const code = ch.codePointAt(0)!;
      if (code === 0 || code === 0xfffd || isControl(code)) continue;
      if (isWhitespace(ch)) spaced += " ";
      else if (isCjk(code) || isPunctuation(ch, code)) spaced += ` ${ch} `;
      else spaced += ch;
    }
    return spaced.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").split(" ").filter(Boolean)
      .flatMap(word => [...word].some(ch => isPunctuation(ch, ch.codePointAt(0)!)) ? word.split(/(\p{P})/u).filter(Boolean) : [word]);
  }

  wordPiece(word: string): number[] {
    const chars = [...word];
    if (chars.length > 100) return [this.unk];
    const out: number[] = [];
    let start = 0;
    while (start < chars.length) {
      let end = chars.length, found: number | undefined;
      while (start < end) {
        const piece = (start > 0 ? "##" : "") + chars.slice(start, end).join("");
        found = this.vocab.get(piece);
        if (found !== undefined) break;
        end -= 1;
      }
      if (found === undefined) return [this.unk];
      out.push(found); start = end;
    }
    return out;
  }

  encode(text: string, maxLength = 128): Encoded {
    const body = this.basic(text).flatMap(word => this.wordPiece(word)).slice(0, maxLength - 2);
    const ids = [this.cls, ...body, this.sep];
    return { ids, mask: ids.map(() => 1) };
  }
}
