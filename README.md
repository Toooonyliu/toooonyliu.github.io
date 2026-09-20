# toooonyliu.github.io

Tony Liu's personal portfolio — hand-built HTML/CSS/JS, no framework or build step, deployed on GitHub Pages.

Built for CMU 15-113 (Effective Coding with AI), Project 1.

## HW3 — Palm of Time

[Live app](https://toooonyliu.github.io/projects/xiaoliuren/) · [Source and project README](projects/xiaoliuren/) · [AI prompt log](projects/xiaoliuren/prompt_log.md)

Palm of Time is a bilingual interactive introduction to Xiao Liu Ren with an animated palm and six symbolic results. The app uses JavaScript's built-in `fetch` to send an HTTPS GET request to Hong Kong Observatory's public Gregorian–lunar calendar API, with a `date` parameter formatted as `YYYY-MM-DD`. The API returns JSON containing Chinese string fields such as `LunarYear` and `LunarDate`; the app parses the lunar month and day and combines them with the traditional two-hour period to calculate the result locally. No API key or authentication is required, and questions are not sent to the calendar API. Successful calendar lookups are cached, and failed requests display a retry option.

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
