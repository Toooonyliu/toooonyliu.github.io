# toooonyliu.github.io

Tony Liu's portfolio of product, UX and game design work, hand-built in HTML, CSS and JavaScript with no framework or build step and served by GitHub Pages at [toooonyliu.github.io](https://toooonyliu.github.io/). Built for CMU 15-113 (Effective Coding with AI).

## Projects in this repository

| Project | What it is | Links |
| --- | --- | --- |
| **One Cut Atlas** (Project 2) | Pixel-art travel and sword-duel game with an AI backend | [Play](https://toooonyliu.github.io/projects/one-cut-atlas/) · [README](projects/one-cut-atlas/README.md) · [Walkthrough](https://toooonyliu.github.io/projects/one-cut-atlas/presentation.html) · [Prompt log](projects/one-cut-atlas/prompt_log.md) · [Backend](https://github.com/Toooonyliu/OneCutAtlas_Backend) |
| **Ask (速问)** (HW3, HW4) | Bilingual Xiao Liu Ren reading with live lunisolar calendar data and a Flask backend | [Live](https://toooonyliu.github.io/projects/xiaoliuren/) · [README](projects/xiaoliuren/README.md) · [HW4 notes](projects/xiaoliuren/HW4.md) |
| **Flighty, a new chapter** | Product-design case study with a working prototype | [Case study](https://toooonyliu.github.io/projects/flighty/) · [README](projects/flighty/README.md) |
| **Kangaroo Crossing** | Crossy Road-inspired arcade browser game | [Play](https://toooonyliu.github.io/games/kangaroo-crossing/) · [README](games/kangaroo-crossing/README.md) |

## Project 2 — One Cut Atlas

One Cut Atlas is a browser-based pixel-art sword-dueling game set on a traveller's desk. A player sends a travel photo as a postcard. A separate Render-hosted Node backend asks an OpenAI vision model to recognize the place from visible clues (people are ignored and never identified), the pixel desk globe turns to it and unlocks its zone with a rubber-stamp reveal, and an OpenAI image model paints an original pixel-art arena of that place. The player's photo is never sent to the painter; it receives a text description and the game's own stages as style references.

Each duel is decided by one clean hit and turns on reading the open line: standing in the same line as an incoming cut blocks it. Quick cuts, charged lunges, feints, evasions and a short playable victory aftermath round it out, with keyboard or mouse control.

The API key stays server-side, with hourly and daily painting caps and a short cache. Stages, painted arenas, photos and progress are saved locally in IndexedDB; there are no accounts. The optional **AI Colors** feature suggests a fighter palette and one of the existing outfits. See the [project README](projects/one-cut-atlas/README.md) for controls, design and architecture, and the [backend README](https://github.com/Toooonyliu/OneCutAtlas_Backend) for the API.

## HW4 — Ask backend integration

The local HW4 update connects Ask to a separate Python/Flask backend for calendar lookup and personal-reading calculation. See [integration and deployment notes](projects/xiaoliuren/HW4.md). Backend: https://ask-backend-s507.onrender.com — the frontend configuration uses this deployed service.

## HW3 — Ask (速问): original implementation

[Live app](https://toooonyliu.github.io/projects/xiaoliuren/) · [Source and project README](projects/xiaoliuren/) · [AI prompt log](projects/xiaoliuren/prompt_log.md)

Ask is a bilingual interactive introduction to Xiao Liu Ren with an animated palm and six symbolic results. The app uses JavaScript's built-in `fetch` to send an HTTPS GET request to Hong Kong Observatory's public Gregorian–Chinese lunisolar calendar API, with a `date` parameter formatted as `YYYY-MM-DD`. The API returns JSON containing Chinese string fields such as `LunarYear` and `LunarDate`; the app parses the lunar month and day and combines them with the traditional two-hour period to calculate the result locally. No API key or authentication is required, and questions are not sent to the calendar API. Successful calendar lookups are cached, and failed requests display a retry option.

To run HW3, install Python 3, run `python3 -m http.server 4173 --directory projects/xiaoliuren` from the repository root, and open `http://localhost:4173/`. No JavaScript packages or build step are needed. See the project README for calculation conventions, source attribution, and optional tests.

## Repository layout

```
index.html, about.html        Portfolio home and about pages (self-contained styles and scripts)
projects/one-cut-atlas/       One Cut Atlas frontend (see its README)
projects/xiaoliuren/          Ask (速问), HW3 and HW4
projects/flighty/             Flighty case study, prototype and documents
games/kangaroo-crossing/      Kangaroo Crossing
favicon*                      Site icons
*-session-log.md              Development session logs
```

## Run locally

No build step. Serve the repository root and open the printed address:

```sh
python3 -m http.server 8000
```

Individual projects document their own commands in their READMEs; One Cut Atlas uses `npm start` and `npm test` inside its folder.

## Deploy

Pushing to `main` publishes the site through GitHub Pages from the repository root. The One Cut Atlas backend deploys separately from its own repository to Render.

## Flighty concept (September 2026)

The homepage now links to `projects/flighty/`: a portfolio-style case study with an on-demand demo preview. The full interactive demo and its source are included in the repository. See [the project README](projects/flighty/README.md) for source and rebuild instructions.
