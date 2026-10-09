# Classic fighter assets

These files were copied from the user-supplied local reference build at
`First Cut Browser Game/web/assets/` on October 9, 2026:

- `game-assets.json`: the compact browser subset of layered sprite metadata.
- `texture-09.png`, `texture-10.png`, `texture-11.png`: the only source atlases
  referenced by that subset.

`src/classic-fighter.js` maps One Cut Atlas combat states onto the supplied
16-frame walk, 12/13-frame cuts, 6-frame evasions, 8-frame shove, 10-frame
stagger and 25-frame fall. During loading it flattens the eight character
layers into small 112×96 player/rival cache frames. The duel loop therefore
draws one small bitmap per fighter instead of cropping eight 2048×2048 atlas
regions every frame.

The local source package's inspection report and SHA-256 inventory remain in
`First Cut Browser Game/ORIGINAL_FILES_REPORT.md` and
`First Cut Browser Game/web/assets/reference/manifest.json`; the original
native gameplay code was not copied or ported.

These are supplied third-party game assets, not the generated One Cut Atlas
art documented in `../art/README.md`. Confirm that you have redistribution
rights before publishing this directory.
