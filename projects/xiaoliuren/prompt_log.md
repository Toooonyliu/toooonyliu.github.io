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


## Approved HTML integration and traditional palette

User approved v7 and requested a quieter production homepage, a slimmer middle finger, slower counting with day/hour restarting taps, researched Chinese traditional colors, optional GPT interpretation choices, offset top labels, a single-line hand favicon and English names/meanings matching the reference. Codex integrated the flowing SVG study, retained calendar/history/voice, researched museum color sources and the 1896 verse transcription, and wrote original English translations. GPT architecture was researched with official OpenAI Docs; no AI API/key was configured. Independent asset/research agents returned palette, English content and favicon assets for review.

## Transparent icon and complete classical text

User requested pushing the updates to GitHub and redeploying the project, a transparent vector favicon inspired by the supplied antique upright-palm diagram, four Chinese verse clauses on the homepage with expandable complete explanations, an English summary followed by expandable full text, and the HathiTrust source link. Codex refined the existing vector identity, made header and portfolio icon colors inherit their surrounding text, added accessible native disclosures, retained the complete common-version preambles with original English translations, and kept the 1896 reference transcription separately labeled. The HathiTrust scan was blocked by a browser verification page and is not claimed as independently verified. No GPT API was enabled.

User requested removing the repeated textual notes and 1896 comparison shown beneath each reading in both languages. Codex removed those blocks across result and Six signs views, retaining the complete reading and original source links.

User clarified that every English disclosure should show only the compact 1896 translation/Chinese pair from their third screenshot under “Read the complete translation and Chinese text”. Chinese should keep the existing reading, omit annotations and the repeated edition, and retain “原文与版本说明见 来源”. Applied across all six signs in both result and meanings views.

User requested a small tab beside the question box that opens a card explaining how beginners should ask, with examples based on Ni Haixia’s video. Codex located the Tian Ji Liu Ren segment and cross-checked its platform-generated and lesson transcripts, added a bilingual native-dialog guide, distinguished editorial examples from quotations, and linked video/transcript sources. Direct video playback was unavailable. Draft questions are preserved and opening help does not calculate or call the calendar API.

User requested removing the guide’s disclaimer paragraph, replacing broken sources with a direct YouTube/Bilibili video, and cleaning up palace labels with pinyin in English. Updated both languages, linked the verified Bilibili page, and aligned labels beneath their moving markers with compact pinyin syllables.
