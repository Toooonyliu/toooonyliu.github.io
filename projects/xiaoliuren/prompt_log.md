# Key prompts and AI usage

Tool: OpenAI Codex, with web research, terminal tools, and Sites publishing. No runtime GPT/DeepSeek API is used by the app. The exact underlying model identifier was not exposed in this session.

Key user prompts (condensed from the actual conversation):

1. Read CMU 15-113 HW3 and explain the assignment for a designer with limited programming experience.
2. Research 小六壬, how to ask questions, how to interpret results, and available public APIs.
3. Prioritize 倪海厦's method; distinguish his teaching from secondary interpretations and unverified conventions.
4. Check whether existing APIs and open-source calculations match that method and satisfy the homework.
5. Find and test a lunar calendar API; select Hong Kong Observatory as the data source.
6. Build a bilingual Chinese/English site inspired by https://6ren.chaosxy.com/, with an artistic line-based hand that performs the counting gesture, month/day/hour labels, separate rules and examples, and mobile support; integrate it into https://github.com/Toooonyliu/toooonyliu.github.io as a standalone project.

Implementation decisions made with Codex: use a deterministic local six-position algorithm, use the external API only for the calendar data, present curated modern advice separately from traditional meanings, document midnight/leap-month/time-zone conventions, and keep user questions local.
