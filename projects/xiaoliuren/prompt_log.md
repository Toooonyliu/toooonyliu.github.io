# Key prompts and AI usage

Tool: OpenAI Codex, with web research, terminal tools, and Sites publishing. No runtime GPT/DeepSeek API is used by the app. The exact underlying model identifier was not exposed in this session.

Key user prompts (condensed from the actual conversation):

1. Read CMU 15-113 HW3 and explain the assignment for a designer with limited programming experience.
2. Research 小六壬, how to ask questions, how to interpret results, and available public APIs.
3. Prioritize 倪海厦's method; distinguish his teaching from secondary interpretations and unverified conventions.
4. Check whether existing APIs and open-source calculations match that method and satisfy the homework.
5. Find and test a lunar calendar API; select Hong Kong Observatory as the data source.
6. Build a bilingual Chinese/English site inspired by https://6ren.chaosxy.com/, with an artistic line-based hand that performs the counting gesture, month/day/hour labels, separate rules and examples, and mobile support; integrate it into https://github.com/Toooonyliu/toooonyliu.github.io as a standalone project.

Implementation decisions made with Codex: use a deterministic local six-position algorithm, use the external API only for the calendar data, present curated modern advice separately from traditional meanings, document midnight/leap-month/time-zone conventions, and process typed questions locally.

7. Simplify the home to the palm, Gregorian/lunar time, and a question panel replaced by results. Use a loose line-art left hand inspired by Karol Ortyl, six result background colors, Chinese classical verses with English translations, voice input, background/sources on subpages, and the exact Chinese consultation reminder.

For this revision, Codex implemented browser speech recognition with typed-input fallback, a six-color visual key, an original animated left-palm SVG, live lunar date display, and keyword-based reflections. Speech audio may be handled by the browser’s speech service. Automated DOM checks used mocked calendar and speech interfaces; real-device microphone testing remains outstanding.
