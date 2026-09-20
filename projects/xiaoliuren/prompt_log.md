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

8. Rename the project 速问 / Ask with single-language titles, use the palm as the logo/favicon/portfolio mark, correct “Chinese lunisolar calendar,” strengthen type hierarchy, add persistent history and outcome review, research timing associations, address unresponsive mobile speech input, and move time/question above the palm on mobile. Create a separate HTML visual study inspired by Luke Wang’s lotus; do not replace the live palm before review.

The history is browser-local with editable outcomes and notes. Timing is labeled as a traditional secondary-source association. The speech changes improve feedback and start/error lifecycle handling, but real-device recognition has not been verified. The independent preview adapts our existing palm silhouette into character shading and simulated depth; the reference’s model/code is not reused.

9. Return to a hand-drawn style. Create two independent HTML previews: a minimal structural outline and a graceful, mudra-inspired form. Keep thumb counting animation, place the thumb at screen-left and 大安 at lower left, enlarge the palm on the desktop’s left side, reconsider typography, and reduce persistent helper copy. Leave the live design unchanged until review.
