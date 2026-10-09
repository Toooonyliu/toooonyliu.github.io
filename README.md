# toooonyliu.github.io

Tony Liu's personal portfolio — hand-built HTML/CSS/JS, no framework or build step, deployed on GitHub Pages.

Built for CMU 15-113 (Effective Coding with AI), Project 1.

## Project 2 — One Cut Atlas

[Play the game](https://toooonyliu.github.io/projects/one-cut-atlas/) · [Project README](projects/one-cut-atlas/README.md) · [English walkthrough](https://toooonyliu.github.io/projects/one-cut-atlas/presentation.html) · [AI prompt log](projects/one-cut-atlas/prompt_log.md)

One Cut Atlas is a browser-based pixel-art sword-dueling game set on a traveller's desk. Players send a travel photo as a postcard: a Render-hosted Node backend asks an OpenAI vision model to recognize the place from visible clues (people are ignored), the pixel desk globe turns to it and unlocks its zone, and an OpenAI image model paints an original pixel-art arena of that place for the duel. Each one-hit duel turns on reading the open line: standing in the same line as a cut blocks it, with quick cuts, charged lunges, feints, evasions and a short playable victory aftermath.

The API key stays server-side with hourly and daily painting caps. Stages, painted arenas, photos and progress are saved locally in IndexedDB. The optional **AI Colors** feature suggests a fighter palette and one of the existing outfits.

[Backend source](https://github.com/Toooonyliu/OneCutAtlas_Backend) · [Live backend](https://one-cut-atlas-api.onrender.com)

## HW4 — Ask backend integration

The local HW4 update connects Ask to a separate Python/Flask backend for calendar lookup and personal-reading calculation. See [integration and deployment notes](projects/xiaoliuren/HW4.md). Backend: https://ask-backend-s507.onrender.com — the frontend configuration uses this deployed service.

## HW3 — Ask (速问): original implementation

[Live app](https://toooonyliu.github.io/projects/xiaoliuren/) · [Source and project README](projects/xiaoliuren/) · [AI prompt log](projects/xiaoliuren/prompt_log.md)

Ask is a bilingual interactive introduction to Xiao Liu Ren with an animated palm and six symbolic results. The app uses JavaScript's built-in `fetch` to send an HTTPS GET request to Hong Kong Observatory's public Gregorian–Chinese lunisolar calendar API, with a `date` parameter formatted as `YYYY-MM-DD`. The API returns JSON containing Chinese string fields such as `LunarYear` and `LunarDate`; the app parses the lunar month and day and combines them with the traditional two-hour period to calculate the result locally. No API key or authentication is required, and questions are not sent to the calendar API. Successful calendar lookups are cached, and failed requests display a retry option.

To run HW3, install Python 3, run `python3 -m http.server 4173 --directory projects/xiaoliuren` from the repository root, and open `http://localhost:4173/`. No JavaScript packages or build step are needed. See the project README for calculation conventions, source attribution, and optional tests.

## Structure

```
index.html                  Home: hero, about, experience, featured work, contact
projects/*.html              One case-study page per project
css/styles.css                Shared styles (design tokens, layout, responsive breakpoints)
js/i18n.js                    EN/中文 copy dictionary
js/main.js                    Language toggle, mobile nav, scroll-reveal
assets/photo/tony.jpg         Headshot
assets/covers/*.svg           Project cover art
```

## Features

- Fully responsive (tested at 375 / 768 / 1024 / 1440px) — no framework, plain CSS with real breakpoints.
- EN / 中文 language toggle, persisted in `localStorage`, driven by the dictionary in `js/i18n.js`.
- Scroll-reveal animation on section entry (`IntersectionObserver`, respects `prefers-reduced-motion`).

## Local development

No build step — just open `index.html`, or serve the folder locally:

```
python3 -m http.server 8000
```

## Editing content

All copy lives in `js/i18n.js`, one key per string, `en` and `zh` side by side. HTML files only reference `data-i18n="key"` (plain text) or `data-i18n-html="key"` (allows inline tags like `<b>`) — edit the dictionary, not the HTML, to change wording.

## Deploying

Pushed to `main` on `toooonyliu.github.io` — GitHub Pages serves it automatically from the repo root.

## Flighty concept (September 2026)

The homepage now links to `projects/flighty/`: a portfolio-style case study with an on-demand demo preview. The full interactive demo and its source are included in the repository. See [the project README](projects/flighty/README.md) for source and rebuild instructions. This addition uses the current static HTML portfolio; the older structure and language-toggle notes above describe an earlier iteration.
