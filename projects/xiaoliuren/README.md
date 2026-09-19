# 掌间 · Palm of Time

A bilingual Chinese/English Xiao Liu Ren learning and reflection website by Tony Liu, made for CMU 15-113 HW3. It pairs an animated, original vector palm diagram with a real Gregorian–lunar calendar API. The minimal home contains three regions: an original animated left-hand drawing, Gregorian/lunar time, and a question box that becomes a colored result. Supporting pages contain worked examples, the six signs, background, and sources. It is a static site suitable for GitHub Pages, desktop and mobile.

## How the API works

The app makes an HTTPS GET request with the browser's built-in `fetch` to Hong Kong Observatory's `lunardate.php` endpoint, passing a Gregorian `date` in `YYYY-MM-DD` format. The response is JSON with Chinese strings `LunarYear` and `LunarDate`, such as `丙午年，馬` and `八月初九`. The app parses the lunar month and day into numbers, derives the traditional hour from the selected local clock time, and computes three inclusive six-position counts locally. It loads the live lunar date on arrival and when the chosen date changes, shares simultaneous requests for the same date, caches successful lookups in memory, times out requests after 10 seconds, and displays an actionable error instead of inventing data when a request or parsing fails. No API key is needed, and the user's question is never sent to the calendar service or an AI model.

Endpoint: `https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php?date=2026-09-19`

## Run locally

No packages or build step are required. With Python 3 installed, run from this directory:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173/`. JavaScript modules require an HTTP server; don't double-click the HTML file. Optional Google Fonts have system-font fallbacks.

With Node.js 18+ installed, run core tests using `node --test tests/core.test.mjs` (or `npm test`).

## How to use

1. Write one specific question, or tap the microphone and allow microphone access. Review the recognized text before beginning.
2. Confirm your time zone under Time settings. The default captures the current time when you begin; a recorded local time is also available.
3. Begin the reading. The thumb follows the month, day and hour counts; each starting position counts as 1.
4. The question box is replaced by the Chinese sign, its classical verse, and a topic-based reflection. English mode retains the Chinese name and verse and adds a translation. Local keyword matching selects among eight topics; these are curated prompts, not AI-personalized predictions.
5. Replay the animation or visit the Method page for two independent examples.

Voice uses `SpeechRecognition` or `webkitSpeechRecognition` where available. It may send audio to the browser vendor’s speech service. HTTPS and microphone permission are required on the deployed site; typing and device-keyboard dictation remain alternatives. Speech support varies by browser. Audio is not recorded or stored by this app.

The same question in the current page session returns its first reading. Only language/time-zone preferences persist on the device; question history is not permanently stored. Reduced-motion users receive the final states without the moving animation.

## Calculation and source boundaries

The order is 大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡. The month starts at 大安, the day starts at the month position, and 子时 starts at the day position. Zero-based formulas are `(month - 1) % 6`, `(monthPosition + day - 1) % 6`, and `(dayPosition + hourIndex - 1) % 6`.

This project references the Ni-style summary at https://6ren.chaosxy.com/ and the course repost at https://www.bilibili.com/video/BV1im4y197mW/. It is not an official Ni Haixia product, a fully verified transcription, or a mirror of the reference site. The public-domain classical verses follow https://6ren.chaosxy.com/results/, with newly authored English translations; ambiguous historical wording is acknowledged. The line-art direction references https://www.karolortyl.com/. Artwork, interface, six-color palette, translations, and reflection prompts were authored for this project. The palette is a visual key, not a traditional five-element mapping. The palm faces the viewer, so its left-hand thumb appears on the viewer’s right. These cultural associations have no established predictive validity.

Implementation conventions, not verified Ni-specific rules: local civil time including DST; date changes at midnight (23:00 uses the current date with 子时); leap months retain their original month number. The API supports dates from 2023 through current year + 2. No true-solar-time correction is applied. The requested three-per-day and sincerity reminders appear on the home page; the daily limit is advisory and not enforced. Their direct attribution to Ni is unverified.

Official calendar dataset: https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table

## Files and deployment

- `index.html` and `style.css`: shared responsive interface.
- `app.js`: bilingual navigation, form state, animation sequence, results.
- `core.js`: calendar API, parser, time conversion, deterministic calculation.
- `palm.js`: original functional SVG palm diagram and articulated thumb animation.
- `content.js`: bilingual teaching copy, six meanings and the original reflection prompts.
- `experience.js`: six colors, classical verses, English translations, speech copy, local topic matching, and additional reflections (48 topic/position pairs across both content files).
- `tests/core.test.mjs`: example, boundary, parser, network and caching tests.
- `prompt_log.md`: AI tool usage and key prompts.

This directory is served by GitHub Pages at `https://toooonyliu.github.io/projects/xiaoliuren/` and linked from Selected Work on the portfolio home page. Assets use relative URLs and supporting views use hash routes, so refreshes work without a server rewrite.

## Validation

Eight core tests cover inclusive counting across all valid month/day/hour combinations, worked examples, lunar parsing, time boundaries, daylight saving, invalid dates, API errors/caching, and concurrent request sharing. A separate jsdom session exercised the actual app with a mocked API: all six themes, replacement results, Chinese/English text, escaping, duplicate protection, errors/retry, navigation, worked examples, and the speech controller. Real microphone recognition and a visual browser/device review were not performed in this environment.

## HW3 submission reminder

The repository includes source, this README, and a prompt log. Record and upload a short demo video, verify its sharing permissions in an incognito window, and submit the course form yourself. The code alone does not complete those submission steps.
