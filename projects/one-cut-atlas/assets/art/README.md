# Art direction and provenance

## Travel Zone stages, October 7

The three new PNG originals are `zone-east-asia-v1.png`, `zone-africa-v1.png`
and `zone-north-america-v1.png`. They were generated with the built-in ImageGen
tool; the exact final prompts are in `zone-v1-provenance.json`.
The game ships derivatives: stage backgrounds are baked onto the renderer's
960×540 world grid with nearest sampling and a 48-color per-image palette as
indexed PNGs named `*-960.png` (`tools/rebake-stages.mjs`, which decodes through
headless Chrome so the repository needs no native image modules), while sprite
sheets ship as lossless `.webp` with their original dimensions and decoded
pixels (`tools/optimize-assets.mjs`). Earlier releases baked stages at 480×270; the
larger grid was adopted on October 9 after painted photo arenas looked soft.
Original PNGs remain in the local workspace.

The interface fonts are Silkscreen, Pixelify Sans and VT323 from Google Fonts,
self-hosted in `assets/fonts/` under the SIL Open Font License 1.1 (license texts
included). The desk, paper, stamp-perforation, torn-edge and ink-mask textures in
`assets/ui/` are generated procedurally by `tools/ui-textures.mjs`. The travel-journal
layout takes its cue from diegetic desk menus in indie pixel games; no third-party
images or UI assets are used.


These original assets were generated with the built-in ImageGen tool for this
prototype. The user-provided First Cut: Samurai Duel screenshot informed the
palette, atmospheric depth, dark fighter silhouettes and pixel texture. These
are new scenes and characters, rather than extracted game assets.

- `forest-v2.png`: red maple ravine, lilac mist and reflective ground.
- `street-v2.png`: weathered Kyoto street, warm lanterns and dusk.
- `city-v2.png`: violet rainy city, neon and wet pavement.
- `wilderness-v2.png`: rocky canyon, distant haze and dry ground.
- `fighters-v2.png`: four costumes, six poses each: idle, walk, windup, strike,
  parry and fallen. Rows: samurai, suit, cowboy and traveler.
- `fighters-v3-{kendo,suit,cowboy,traveler}-attacks.png`: 16 authored frames per
  costume. Four action rows: overhead chop, horizontal cut, rising cut and
  counter backslash. Each row has preparation, movement, contact and recovery.
- `fighters-v3-{kendo,suit,cowboy,traveler}-defense.png`: 24 authored frames per
  costume. Four frames each for back dodge, forward duck, charge preparation,
  high hit, middle hit and low hit. Hit reactions progress into a grounded fall.
- `fighters-v3-contact.png`: supplementary overhead and low contact poses for
  all four costumes. The overhead contact poses join the descending cut;
  its low poses provide the forward low guard. Forward-duck poses supply the
  low cut's initial contact before its rising arc.

`src/art.js` isolates connected silhouettes, removes detached low-alpha noise,
normalizes each costume from its standing pose, preserves its authored pivot,
and prepares a common two-world-pixel texture grid. Active blade reach matches
the existing combat engine. Dry wilderness omits wet-ground reflections.

Generation prompts and alpha-component analysis are retained in the workspace
at `../../../art-candidates/`. Browser QA screenshots and the supplied
reference are retained in `../../work/`; neither folder is part of the build.

The renderer advances authored frames using the engine's elapsed state timer.
High and low cuts have an additional contact pose, counters use matching
directional contact, held ducks settle in a low pose, and hit direction selects
the four-frame recoil and fall sequence. Charge strength expands visible reach
alongside the engine. Idle and parry stances show different blade heights.

The v3 source images remain unchanged. Their generated native dimensions are
1536×1024 for attacks and 1254×1254 for defense; extraction uses their native
grid ratios instead of assuming the requested output size. Full prompts,
generation paths and preparation details are in `fighters-v3-provenance.json`.
`fighters-v3-analysis.json` records pixel component counts and bounds for
transparent-mask QA. Every main atlas has exactly one significant fighter
component in each intended slot at alpha thresholds 16 and 140.
