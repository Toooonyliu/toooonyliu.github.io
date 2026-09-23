# 速问 · Ask

A bilingual Chinese/English Xiao Liu Ren learning and reflection website by Tony Liu, made for CMU 15-113 HW3. It pairs an animated, original vector palm diagram with a real Gregorian–Chinese lunisolar calendar API. The minimal home contains three regions: an original animated left-hand drawing, Gregorian/Chinese lunisolar time, and a question box that becomes a colored result. Supporting pages contain worked examples, the six signs, background, and sources. It is a static site suitable for GitHub Pages, desktop and mobile.

## How the API works

The app makes an HTTPS GET request with the browser's built-in `fetch` to Hong Kong Observatory's `lunardate.php` endpoint, passing a Gregorian `date` in `YYYY-MM-DD` format. The response is JSON with Chinese strings `LunarYear` and `LunarDate`, such as `丙午年，馬` and `八月初九`. The app parses the lunar month and day into numbers, derives the traditional hour from the selected local clock time, and computes three inclusive six-position counts locally. It loads the live Chinese lunisolar date on arrival and when the chosen date changes, shares simultaneous requests for the same date, caches successful lookups in memory, times out requests after 10 seconds, and displays an actionable error instead of inventing data when a request or parsing fails. No API key is needed, and the user's question is never sent to the calendar service or an AI model.

Endpoint: `https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php?date=2026-09-19`

## Run locally

No packages or build step are required. With Python 3 installed, run from this directory:

```sh
python3 -m http.server 4173 --directory .
```

Open `http://localhost:4173/`. JavaScript modules require an HTTP server; don't double-click the HTML file. Optional Google Fonts have system-font fallbacks.

With Node.js 18+ installed, run the calculation and journal tests using `npm test`.

## How to use

1. Write one specific question, or tap the microphone and allow microphone access. Review the recognized text before beginning.
2. Click the date/time display to edit date, time and IANA time zone. The current UTC offset is visible. Changing a draft zone preserves the instant; daylight-saving gaps are rejected and repeated hours use the earlier occurrence.
3. Begin the reading. The thumb follows the month, day and hour counts; each starting position counts as 1.
4. The question box is replaced by the Chinese sign, its classical verse, and a topic-based reflection. English mode retains the Chinese name and verse and adds a translation. Local keyword matching selects among eight topics; these are curated prompts, not AI-personalized predictions.
5. Replay the animation or visit the Method page for two independent examples.
6. Open History to record whether the result matched what actually happened. This is a personal observation journal, not evidence of predictive validity.

Voice uses `SpeechRecognition` or `webkitSpeechRecognition` where available. It may send audio to the browser vendor’s speech service. HTTPS and microphone permission are required on the deployed site; typing and device-keyboard dictation remain alternatives. Speech support varies by browser. Audio is not recorded or stored by this app.

Guest readings persist in localStorage on the current browser, alongside language/time-zone preferences. History lets you reopen the original question, timestamp, calendar data and saved modern reflection; add an outcome, actual event date and notes; or delete one record. Repeating a saved question returns its first reading. Guest history does not sync and is lost if site data is cleared. Signed-in history syncs through Supabase; local records upload only after explicit import. Storage failures are shown; unreadable stored data is not silently overwritten. Reduced-motion users receive final positions without the counting animation.

## Calculation and source boundaries

The order is 大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡. The month starts at 大安, the day starts at the month position, and 子时 starts at the day position. Zero-based formulas are `(month - 1) % 6`, `(monthPosition + day - 1) % 6`, and `(dayPosition + hourIndex - 1) % 6`.

This project references the Ni-style summary at https://6ren.chaosxy.com/ and the course repost at https://www.bilibili.com/video/BV1im4y197mW/. It is not an official Ni Haixia product, a fully verified transcription, or a mirror of the reference site. The public-domain classical verses follow https://6ren.chaosxy.com/results/, with newly authored English translations; ambiguous historical wording is acknowledged. The line-art direction references https://www.karolortyl.com/. Artwork, interface, six-color palette, translations, and reflection prompts were authored for this project. The palette is a visual key, not a traditional five-element mapping. The diagram uses the user-selected screen orientation: thumb on the left, little finger on the right, and 大安 at the lower-left counting position. These cultural associations have no established predictive validity.

Implementation conventions, not verified Ni-specific rules: local civil time including DST; date changes at midnight (23:00 uses the current date with 子时); leap months retain their original month number. The API supports dates from 2023 through current year + 2. No true-solar-time correction is applied. The requested three-per-day and sincerity reminders appear on the home page; the daily limit is advisory and not enforced. Their direct attribution to Ni is unverified.

Official calendar dataset: https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table

## Files and deployment

- `dist/index.html` and `dist/style.css`: shared responsive interface.
- `dist/app.js`: bilingual navigation, form state, animation sequence, results.
- `dist/core.js`: calendar API, parser, time conversion, deterministic calculation.
- `dist/palm.js`: original functional SVG palm diagram and articulated thumb animation.
- `dist/content.js`: bilingual teaching copy, six meanings and the original reflection prompts.
- `dist/journal.js`: validated device-local history, outcome copy, and source-qualified timing associations.
- `dist/experience.js`: six colors, classical verses, English translations, speech copy, local topic matching, and additional reflections (48 topic/position pairs across both content files).
- `tests/core.test.mjs` and `tests/journal.test.mjs`: calculation, API and persistent-history checks.
- `previews/palm-study.html`: standalone character-shaded 2.5D palm study. It is not imported by the production app and requires no server or packages; open this HTML directly.
- `prompt_log.md`: AI tool usage and key prompts.

For GitHub Pages, copy the contents of `dist/` into `projects/xiaoliuren/` in the portfolio repository and link the project card to `projects/xiaoliuren/`. All assets use relative URLs; secondary views use hash routes, so direct links and refreshes work without a server rewrite. Sites hosting metadata is kept separately in `.openai/hosting.json`.

## Validation

Ten automated tests cover persistence, corrupt/blocked storage, and inclusive counting across all valid month/day/hour combinations, worked examples, lunar parsing, time boundaries, daylight saving, invalid dates, API errors/caching, and concurrent request sharing. A separate jsdom session exercised the actual app with a mocked API: all six themes, replacement results, Chinese/English text, escaping, duplicate protection, errors/retry, navigation, worked examples, and the speech controller. Additional DOM checks cover journal reload, review save, reopening/deletion, single-language branding, the mobile content order, and voice-service timeouts. The standalone canvas study was rendered and inspected with a temporary canvas renderer. Real microphone recognition and a visual browser/device review remain unverified in this environment.

## HW3 submission reminder

The repository includes source, this README, and a prompt log. Record and upload a short demo video, verify its sharing permissions in an incognito window, and submit the course form yourself. The code alone does not complete those submission steps.

## September 20 revision

The displayed name is 速问 in Chinese and Ask in English. The header, favicon and portfolio card use our existing left-palm outline. Mobile reading order is time → question/result → palm, with larger question/result type and secondary metadata. English calls the calendar “Chinese lunisolar calendar.” Speech starts directly within the tap handler and reports connecting, unsupported, permission, network, empty and timeout states; device keyboard dictation is the fallback.

Timing associations follow the chosen Ni-style secondary summaries: 大安 approximately one week, 速喜 soon, 小吉 approximately two weeks; 留连, 赤口 and 空亡 have no fixed date. Source: https://www.shenjige.cn/details/I8TyiKp2X.html and https://6ren.chaosxy.com/. These are traditional symbolic associations, not verified deadlines or a fully checked transcript of Ni’s original lecture.

The independent visual study references https://lukewangdesign.com/ — a WebGL lotus rendered as interactive ASCII characters. Our study reuses our original SVG silhouette with a simulated depth field, lighting, rotation, touch color and a three-stage thumb demonstration. It is explicitly a 2.5D study, not a fully rigged 3D hand, and does not copy the lotus model or implementation. This earlier ASCII direction was superseded by the approved flowing line drawing.

## Hand-drawn A/B previews

Two independent previews compare a minimal structural palm (`previews/palm-structure.html`) with a flowing, mudra-inspired contour (`previews/palm-flow.html`). Both retain an animated counting thumb and use the requested screen orientation, with the thumb on the left. These early studies demonstrate a fixed example; the approved v7 flowing silhouette is now integrated into production with live calendar counting. See `previews/hand-directions.md` for layout/type recommendations and testing limits.


## Approved flowing-hand revision (v8)

The home now follows the selected HTML study: a large, softly fanned hand on the left, with time and the question/result on the right; mobile orders time → question/result → palm. The middle finger is slightly slimmer. Counting is slower, and day/hour stages visibly lift and re-touch the starting position before proceeding, without adding a mathematical count. Six interactive color keys also preview their gestures. Labels are optional and the top three are offset beside their fingers. The favicon/header/project-card mark is an original single-contour hand.

The six colors are inspired by documented traditional materials: 石绿/malachite, 靛青/indigo, 朱砂/cinnabar, 胭脂/rouge, 藤黄/gamboge, 松烟/pine-soot ink. These screen values and emotional associations are design interpretations, not traditional six-sign or Ni-specific assignments. The yellow theme uses dark text and strokes; all foreground pairs meet 4.5:1 contrast. Museum references and per-color explanations are available in About.

English uses Da An, Liu Lian, Su Xi, Chi Kou, Xiao Ji and Kong Wang, with the reference page’s teaching glosses and independently written short summaries. The original v8 verses followed the reference’s transcription of the 1896 多文堂《中外提福》 edition; v9 now also preserves the longer common-version reading requested by the user, with edition sources explained in About. Historical wording differences are described in About. Full texts are expandable on both the result and the Six signs page; timing context lives in About to simplify the home.

### Question-specific interpretation choices

The current implementation retains deterministic local topic/sign prompts, with no GPT call or secret key. It is instant, free of model usage charges, and never sends questions to an AI service; signed-in history is stored in Supabase. It handles eight topic categories but cannot interpret arbitrary context.

Recommended optional next step: keep calendar conversion and the six-position calculation deterministic; send only the user’s question, calculated sign, vetted symbolic meaning and interface language to a server endpoint that calls the OpenAI Responses API. Return a short interpretation plus one practical next step with Structured Outputs; prohibit changing the sign, inventing dates, or presenting predictions as facts. Validate output and fall back to the current prompt on timeout/refusal. A server must hold the API key; never place it in GitHub Pages assets. Show the question-sharing notice before enabling AI and save the delivered interpretation with the existing local history. This is a proposed option, not a connected feature in this release.

Official references: https://developers.openai.com/api/docs/guides/structured-outputs and https://developers.openai.com/api/reference/overview .

New files: `dist/home.css` (approved layout and responsive refinements), `dist/time.js` (date-specific offset and civil-time validation). Existing history, voice, method examples and deterministic calculation remain.

V8 checks: all 10 existing calculation/history tests pass. A module-level app integration run checked six color/pose previews, label preferences, concrete UTC offsets and editable time, bilingual results, stored readings, all five routes, and a complete non-reduced example (7044 ms) with exactly two stage-start retaps. No runtime errors. Real-browser layout and microphone behavior are not newly verified.

## Transparent palm mark and complete readings (v9)

The original upright palm mark is a transparent SVG with no background shape. The header and portfolio card use the SVG as an alpha mask so its strokes inherit the current text color; the browser-tab SVG adapts to light/dark browser themes. Cache identifiers were updated.

Chinese results preview four verse clauses (two couplets). A native accessible disclosure opens the complete common-version preamble, all eight verse clauses and the original explanation. English results start with the concise definition and keep the complete English translation and Chinese text inside the same disclosure. The Six signs page follows the same pattern. Da An’s short English definition is the wording supplied by the user; other summaries and full translations are written for this project.

The full common version is transcribed from https://6ren.chaosxy.com/results/ ; that site's English page provides a different 1896 transcription. The cited wording is retained, with general edition context in Sources. Original source link: https://babel.hathitrust.org/cgi/pt?id=uc1.$b466495&seq=35 (scans 35–36). HathiTrust returned a browser verification challenge during this update, so the scan has not been independently checked; the distinction is explained in Sources.

The per-sign textual notes and duplicate 1896 comparison were removed at the user’s request. Complete Chinese readings, English translations and the source links remain available.

English reading disclosures now contain only one continuous translation of the 1896 reference transcription, its corresponding Chinese text and the Sources link. The longer common-version English preamble and duplicate Chinese rendering are removed. Chinese readings retain the common-version poem and explanation, without textual notes or an additional traditional-character edition. The source caption is restored to “原文与版本说明见 来源”.

## How-to-ask dialog

The question box now has a bilingual “如何提问 / How to ask” button. It opens a native modal with three short principles, an editorial sentence scaffold, and meeting/travel/lost-document examples. It preserves the draft and never starts a reading. Native dialog behavior provides focus containment and Escape dismissal; explicit close and Done controls return focus to the help button. The modal scrolls within small screens.

Research: Ni Haixia’s Tian Ji Liu Ren segment is linked at https://www.douyin.com/video/7108404140098768140 . Accessible platform-generated transcript at https://www.douyin.com/shipin/7533061246984194099 (related 06:18 “掐指一算：六壬法” clip) was cross-checked with the lesson transcript at https://woniuapp.cn/videos/1/38.html . Video playback/caption endpoints could not be accessed directly, so this is a transcript-based summary, not a claim of listening to the recording. The three supported principles concern one specific matter, the moment the question arises, and not changing the time to force a preferred sign. Example questions and the scaffold are our adaptations. No invented timestamps or claim that a time limit or daily maximum came from this segment.

The guide now links directly to the Bilibili lesson at https://www.bilibili.com/video/BV17z4y1e73x/ ; the redundant explanatory paragraph and old video/transcript links were removed from the dialog. Hand labels sit consistently below each palace marker and track its movement; English uses compact two-line pinyin instead of Chinese labels.

## Approved brush palm identity

The selected generated brush-stroke hand is now the favicon, header mark and portfolio project mark. The original approved PNG is preserved in `previews/branding/approved-brush-palm.png`. `mark.png` is a transparent, compact web export, with `mark-light.png` for dark browser tabs. Header and portfolio CSS alpha masks inherit the surrounding text color. These exports preserve the approved brushwork as raster artwork, rather than claiming a traced vector. The earlier SVG wrapper is retained as an unused archive asset; production uses PNG directly for compatibility.

## Account history integration — Google sign-in

Google sign-in is enabled through Supabase. The project owner has configured the provider and the public website return URL. Email-code login remains an optional code path and requires SMTP if selected; it is not the active login method. See [Google setup instructions](supabase/GOOGLE-SETUP.md), [schema](supabase/schema.sql), and [database access checks](supabase/verify-access.sql). Only a Project URL and browser publishable key belong in `account-config.js`; no administrative credential belongs in the website.

Guest records retain the existing browser store. Account records stay separate and sync through user-scoped database policies. Importing guest history requires an explicit action. Failed cloud writes remain visibly pending in page memory with a retry action and leave-page warning. Account changes clear the previous account's page state. Cross-device review edits use last successful write; use Refresh history to see changes from another device.

Validation: 20 Node tests pass, including account isolation, stale responses, explicit/idempotent import, offline retry and deletion. The actual SQL permission checks also pass in an isolated PostgreSQL-compatible PGlite instance. The live Google authorization endpoint redirects to Google and anonymous database reads are denied. Actual user authorization and two-device sign-in verification must be completed by the account owner after deployment. No OAuth client secret is shipped in the website.
