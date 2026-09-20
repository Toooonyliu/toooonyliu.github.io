# 速问 · Ask

A bilingual Chinese/English Xiao Liu Ren learning and reflection website by Tony Liu, made for CMU 15-113 HW3. It pairs an animated, original vector palm diagram with a real Gregorian–Chinese lunisolar calendar API. The minimal home contains three regions: an original animated left-hand drawing, Gregorian/Chinese lunisolar time, and a question box that becomes a colored result. Supporting pages contain worked examples, the six signs, background, and sources. It is a static site suitable for GitHub Pages, desktop and mobile.

## How the API works

The app makes an HTTPS GET request with the browser's built-in `fetch` to Hong Kong Observatory's `lunardate.php` endpoint, passing a Gregorian `date` in `YYYY-MM-DD` format. The response is JSON with Chinese strings `LunarYear` and `LunarDate`, such as `丙午年，馬` and `八月初九`. The app parses the lunar month and day into numbers, derives the traditional hour from the selected local clock time, and computes three inclusive six-position counts locally. It loads the live Chinese lunisolar date on arrival and when the chosen date changes, shares simultaneous requests for the same date, caches successful lookups in memory, times out requests after 10 seconds, and displays an actionable error instead of inventing data when a request or parsing fails. No API key is needed, and the user's question is never sent to the calendar service or an AI model.

Endpoint: `https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php?date=2026-09-19`

## Run locally

No packages or build step are required. With Python 3 installed, run from this directory:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173/`. JavaScript modules require an HTTP server; don't double-click the HTML file. Optional Google Fonts have system-font fallbacks.

With Node.js 18+ installed, run the calculation and journal tests using `npm test`.

## How to use

1. Write one specific question, or tap the microphone and allow microphone access. Review the recognized text before beginning.
2. Confirm your time zone under Time settings. The default captures the current time when you begin; a recorded local time is also available.
3. Begin the reading. The thumb follows the month, day and hour counts; each starting position counts as 1.
4. The question box is replaced by the Chinese sign, its classical verse, and a topic-based reflection. English mode retains the Chinese name and verse and adds a translation. Local keyword matching selects among eight topics; these are curated prompts, not AI-personalized predictions.
5. Replay the animation or visit the Method page for two independent examples.
6. Open History to record whether the result matched what actually happened. This is a personal observation journal, not evidence of predictive validity.

Voice uses `SpeechRecognition` or `webkitSpeechRecognition` where available. It may send audio to the browser vendor’s speech service. HTTPS and microphone permission are required on the deployed site; typing and device-keyboard dictation remain alternatives. Speech support varies by browser. Audio is not recorded or stored by this app.

Readings now persist in localStorage on the current browser, alongside language/time-zone preferences. History lets you reopen the original question, timestamp, calendar data and saved modern reflection; add an outcome, actual event date and notes; or delete one record. Repeating a saved question returns its first reading. History does not sync across devices and is lost if site data is cleared. Storage failures are shown; unreadable stored data is not silently overwritten. Reduced-motion users receive final positions without the counting animation.

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
- `journal.js`: validated device-local history, outcome copy, and source-qualified timing associations.
- `experience.js`: six colors, classical verses, English translations, speech copy, local topic matching, and additional reflections (48 topic/position pairs across both content files).
- `tests/core.test.mjs` and `tests/journal.test.mjs`: calculation, API and persistent-history checks.
- `previews/palm-study.html`: standalone character-shaded 2.5D palm study. It is not imported by the production app and requires no server or packages; open this HTML directly.
- `prompt_log.md`: AI tool usage and key prompts.

This directory is served at `https://toooonyliu.github.io/projects/xiaoliuren/` and linked from Selected Work. The old path is retained so existing HW3 submission links still work. All assets use relative URLs and supporting views use hash routes. The independent hand study is at `previews/palm-study.html`; it does not replace or load in the live consultation page.

## Validation

Ten automated tests cover persistence, corrupt/blocked storage, and inclusive counting across all valid month/day/hour combinations, worked examples, lunar parsing, time boundaries, daylight saving, invalid dates, API errors/caching, and concurrent request sharing. A separate jsdom session exercised the actual app with a mocked API: all six themes, replacement results, Chinese/English text, escaping, duplicate protection, errors/retry, navigation, worked examples, and the speech controller. Additional DOM checks cover journal reload, review save, reopening/deletion, single-language branding, the mobile content order, and voice-service timeouts. The standalone canvas study was rendered and inspected with a temporary canvas renderer. Real microphone recognition and a visual browser/device review remain unverified in this environment.

## HW3 submission reminder

The repository includes source, this README, and a prompt log. Record and upload a short demo video, verify its sharing permissions in an incognito window, and submit the course form yourself. The code alone does not complete those submission steps.

## September 20 revision

The displayed name is 速问 in Chinese and Ask in English. The header, favicon and portfolio card use our existing left-palm outline. Mobile reading order is time → question/result → palm, with larger question/result type and secondary metadata. English calls the calendar “Chinese lunisolar calendar.” Speech starts directly within the tap handler and reports connecting, unsupported, permission, network, empty and timeout states; device keyboard dictation is the fallback.

Timing associations follow the chosen Ni-style secondary summaries: 大安 approximately one week, 速喜 soon, 小吉 approximately two weeks; 留连, 赤口 and 空亡 have no fixed date. Source: https://www.shenjige.cn/details/I8TyiKp2X.html and https://6ren.chaosxy.com/. These are traditional symbolic associations, not verified deadlines or a fully checked transcript of Ni’s original lecture.

The independent visual study references https://lukewangdesign.com/ — a WebGL lotus rendered as interactive ASCII characters. Our study reuses our original SVG silhouette with a simulated depth field, lighting, rotation, touch color and a three-stage thumb demonstration. It is explicitly a 2.5D study, not a fully rigged 3D hand, and does not copy the lotus model or implementation. The production palm remains unchanged pending review.
