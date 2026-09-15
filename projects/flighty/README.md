# Flighty — From flights to journeys

Independent concept by Tony Liu. The case study follows the existing portfolio's white/black palette, Space Grotesk type, pixel labels, dotted background, and section rules. The demo retains the Flighty-inspired dark mobile UI.

- Case study: https://toooonyliu.github.io/projects/flighty/
- Interactive demo: https://toooonyliu.github.io/projects/flighty/demo/
- `index.html`, `portfolio.css`, `case-study.css`: static case study, no build needed.
- `images/`: actual prototype captures, not original account screenshots.
- `demo/`: committed static production build, served directly by GitHub Pages.
- `source/`: source snapshot of the implemented prototype (original commit 9da7c721601f49abf04950ae0185b4da6752e514). No credentials or private QA captures included. The existing Sites deployment is separate.

## Rebuild the demo

Use Node 24 and npm. From `projects/flighty/source`:

```sh
npm ci
npm run build:pages
cd ..
node export-demo.mjs
```

Commit updated source and `demo/` together. The export scopes root-relative asset references to `/projects/flighty/demo/assets/`, including globe textures and phone assets, without changing the protected mobile runtime. Worker output is not needed on GitHub Pages. Preview from the repository root with `python3 -m http.server 8000`.

## Data and scope

Sample/manual loyalty records, local browser persistence, no production account or live flight integrations. This is not an official Flighty project. No customer research or measured business outcomes are claimed. Asset provenance is in `source/public/assets/SOURCES.md`.
