# 掌间 · Palm of Time

A bilingual Chinese/English Xiao Liu Ren learning and reflection website by Tony Liu, made for CMU 15-113 HW3. It pairs an animated, original vector palm diagram with a real Gregorian–lunar calendar API. The interface includes consultation, an interactive worked-example page, six meanings, and rules/source attribution. It is a static site suitable for GitHub Pages, desktop and mobile.

## How the API works

The app makes an HTTPS GET request with the browser's built-in `fetch` to Hong Kong Observatory's `lunardate.php` endpoint, passing a Gregorian `date` in `YYYY-MM-DD` format. The response is JSON with Chinese strings `LunarYear` and `LunarDate`, such as `丙午年，馬` and `八月初九`. The app parses the lunar month and day into numbers, derives the traditional hour from the selected local clock time, and computes three inclusive six-position counts locally. It caches successful date lookups in memory, times out requests after 10 seconds, and displays an actionable error instead of inventing data when a request or parsing fails. No API key is needed, and the user's question is never sent to the calendar service or an AI model.

Endpoint: `https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php?date=2026-09-19`

## Run locally

No packages or build step are required. With Python 3 installed, run from this directory:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173/`. JavaScript modules require an HTTP server; don't double-click the HTML file. Optional Google Fonts have system-font fallbacks.

With Node.js 18+ installed, run core tests using `node --test tests/core.test.mjs` (or `npm test`).

## How to use

1. Write one specific question and choose its topic.
2. Confirm your time zone under Time settings. The default captures the current time when you begin; a recorded local time is also available.
3. Begin the reading. The thumb follows the month, day and hour counts; each starting position counts as 1.
4. Read the traditional summary and separate topic-based reflection prompt. These are curated templates, not AI-personalized predictions.
5. Replay the animation or visit the Method page for two independent examples.

The same question in the current page session returns its first reading. Only language/time-zone preferences persist on the device; question history is not permanently stored. Reduced-motion users receive the final states without the moving animation.

## Calculation and source boundaries

The order is 大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡. The month starts at 大安, the day starts at the month position, and 子时 starts at the day position. Zero-based formulas are `(month - 1) % 6`, `(monthPosition + day - 1) % 6`, and `(dayPosition + hourIndex - 1) % 6`.

This project references the Ni-style summary at https://6ren.chaosxy.com/ and the course repost at https://www.bilibili.com/video/BV1im4y197mW/. It is not an official Ni Haixia product, a fully verified transcription, or a mirror of the reference site. Artwork, interface and reflection prompts were authored for this project. These cultural associations have no established predictive validity.

Implementation conventions, not verified Ni-specific rules: local civil time including DST; date changes at midnight (23:00 uses the current date with 子时); leap months retain their original month number. The API supports dates from 2023 through current year + 2. No true-solar-time correction is applied. The three-per-day rule on the reference website is not enforced because the direct attribution is unverified.

Official calendar dataset: https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table

## Files and deployment

- `index.html` and `style.css`: shared responsive interface.
- `app.js`: bilingual navigation, form state, animation sequence, results.
- `core.js`: calendar API, parser, time conversion, deterministic calculation.
- `palm.js`: original functional SVG palm diagram and articulated thumb animation.
- `content.js`: English/Chinese copy, six meanings and 24 topic-based advice pairs.
- `tests/core.test.mjs`: example, boundary, parser, network and caching tests.
- `prompt_log.md`: AI tool usage and key prompts.

For GitHub Pages, copy the contents of `` into `projects/xiaoliuren/` in the portfolio repository and link the project card to `projects/xiaoliuren/`. All assets use relative URLs; secondary views use hash routes, so direct links and refreshes work without a server rewrite. Sites hosting metadata is kept separately in `.openai/hosting.json`.

## HW3 submission reminder

The repository includes source, this README, and a prompt log. Record and upload a short demo video, verify its sharing permissions in an incognito window, and submit the course form yourself. The code alone does not complete those submission steps.

## Portfolio integration

Live project path: `https://toooonyliu.github.io/projects/xiaoliuren/`. Linked from Selected Work on the portfolio home page.
