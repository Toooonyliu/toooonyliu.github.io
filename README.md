# toooonyliu.github.io

Tony Liu's personal portfolio — hand-built HTML/CSS/JS, no framework or build step, deployed on GitHub Pages.

Built for CMU 15-113 (Effective Coding with AI), Project 1.

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
