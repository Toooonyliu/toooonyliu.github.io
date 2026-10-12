# Mibly prototype source

This is the maintained source for the interactive prototype and the product/process presentations in the Mibly portfolio case study.

## Build the GitHub Pages demo

From this directory:

```sh
npm ci
npm run build
node ../export-demo.mjs
```

The build produces `dist/client`. The exporter copies that static output to `../demo` and scopes root-relative asset paths to `/projects/mibly/demo/`. Relative presentation asset paths remain relative. Serve the portfolio repository root to preview the exported demo at `/projects/mibly/demo/`.

The copied source retains the original mobile runtime and its integrity checks. The build script is static-only for this portfolio: it does not run the Sites-specific packaging script or include the original hosting registration. The protected Sites packaging script and worker remain unchanged for runtime integrity, but are not part of the GitHub Pages export.

## Important behavior

- `?presentation=1` uses temporary state. Rehearsals and embedded portfolio interactions do not overwrite saved app data.
- Embedded demo scene commands and state updates validate the parent origin and presentation session.
- People, meal histories, social actions, and the illustrated map are prototype scenarios. No accounts, messages, or location tracking are live.
- Meal photos were supplied by the designer. Original photo files are not included; optimized presentation copies are under `public/assets/meals`.
- Historical screenshot provenance is recorded in `public/slides/assets/iterations/manifest.json`.

The standalone app is `../demo/index.html`. Presentations are `../demo/slides/product.html` and `../demo/slides/process.html`.
