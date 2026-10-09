# One Cut Atlas

A pixel-art travel and sword-duel game for the browser. Send a postcard from
your travels, watch the globe unlock that place, and settle it with one clean
cut in a pixel arena painted from your photo.

[Play](https://toooonyliu.github.io/projects/one-cut-atlas/) ·
[Walkthrough](https://toooonyliu.github.io/projects/one-cut-atlas/presentation.html) ·
[Backend](https://github.com/Toooonyliu/OneCutAtlas_Backend) ·
[Prompt log](prompt_log.md)

> This technical README was written with AI assistance and must not be
> presented as the student's independently written assignment README.

## Run it

Node 22 or newer, no dependencies.

```sh
npm start      # static preview at http://127.0.0.1:4173 (PORT to change)
npm test       # combat, photo-stage, storage and pixelization tests
npm run build  # copies the static game into dist/
```

The frontend works without the backend: preset stages, duels and saves are
local. Photo stages and AI Colors call the public backend set in the
`one-cut-api-base` meta tag of `index.html`; no key is ever in the browser.

## The desk

The home screen is a traveller's desk. The title menu is bare pixel text:
**Fight**, **Send a postcard**, **Fighter**, **Destinations** and
**Difficulty**. The selected stage is a postcard; the photo upload is a blank
postcard; progress is a row of eleven passport stamps that ink and cancel as
zones are cleared; Destinations opens a typed traveller's log.

The globe is a desk globe drawn pixel by pixel: ordered-dither light bands, a
flat sea with glints, unexplored land as a fog checker, cleared zones in full
color with a gold rim, a brass meridian ring and base, and flag pins. Drag or
use the arrow keys to turn it, the wheel or pinch to zoom, and click land to
choose that zone. The eleven zones are artistic navigation regions, not
political boundaries. Geography is bundled Natural Earth data.

## Photo stages

1. **Send a postcard.** Drop a travel photo of a landmark, street or
   landscape. It is compressed in the browser and shown as a pixel mosaic with
   a scan line while the backend's scout reads it.
2. **Unlock.** A vision model (`gpt-6-luna`, high image detail) lists visible
   clues first, such as architecture, the script on signs and vegetation, then
   names the place. People are ignored and never identified; sign text may be
   read as a clue but is never copied into the result. Photo GPS, when
   present, is sent rounded to about 100 m and wins. The globe turns to the
   place, zooms in, the zone lifts with a glowing outline, and a rubber stamp
   names the stage. **Not here? Scan again** re-asks while excluding earlier
   answers.
3. **Challenge.** The backend paints one original pixel-art backdrop of that
   place with `gpt-image-2` at medium quality, attaching the game's own shipped
   stages as style references. `src/pixelize.js` snaps it onto the 960×540
   world grid with a per-image 48-color palette, and the duel starts. If
   painting is unavailable, the region's preset stage is used.

The stage and its painted backdrop are saved in IndexedDB, so replays never
paint again. Measured October 8–9, 2026: recognition placed eight of nine of
the developer's own travel photos in the right city (a volcano without signage
stayed unrecognized and becomes an uncharted stage); painting costs about
$0.046 and 27 s per arena. The backend caps paintings per hour and per day and
caches repeats.

**AI Colors** in the Fighter dialog is separate: it returns four colors and one
of the four existing outfits for the player or rival. It does not reconstruct
a face or generate sprites. Only use photos you own or may share.

## Duel

| Input | Action |
| --- | --- |
| A / D or ← / → | Move |
| Mouse height, W / X / S, or 1 / 2 / 3 | Set the blade line: high, mid or low |
| Tap J or left mouse | Quick cut |
| Hold J or left mouse, release | Charged cut with a longer lunge |
| Tap, then switch to a neighbouring line | Feint (once per committed swing) |
| Hold K | Firm guard in your line: harder parry, longer counter window |
| Space or right mouse / hold C | Evade back (beats high and low cuts) / duck forward (beats mid cuts) |
| L | Counter after a block or evade |
| V | Close shove; with backward movement, a pull |
| Esc / R | Pause / rematch after the result |

The mouse line has a little hysteresis and only changes while you are free to act, so a drifting hand never withdraws a cut; line changes on the keyboard can still feint on purpose. Add `?debug` to the URL to expose the live duel engine for automated playtests.

One clean hit decides the duel. **Standing in the same line as an incoming cut
blocks it**, so the duel is about reading which line the opponent leaves open.
Matching simultaneous cuts clash. Misses, blocks and shoves build temporary
fatigue. The computer opponent reacts to visible wind-ups after a human-like
delay, aims at the open line more often on harder difficulties, and can be
baited by a feint.

The decisive cut freezes for a beat, flashes white, throws a heavy spray, and
the loser staggers before falling over 1.3 s; the winner holds the
follow-through and keeps control for a five-second aftermath. Walking keeps
the blade steady in its guard while the lower body steps from the hip; idle
fighters breathe, turns squash through a thin silhouette, and cuts lean back,
surge forward and leave a lingering crescent.

These rules were rebuilt from First Cut's public instructions and from
studying how classic one-hit duels layer their animation and timing. No First
Cut code, art or audio is included in this repository.

## Project layout

```
index.html, src/style.css   Desk menu, dialogs, duel HUD
src/app.js                  Screens, photo gate, input, duel loop
src/engine.js               Deterministic fixed-step duel rules and AI
src/art.js, src/render.js   Sprite preparation, animation, effects, stages
src/globe.js                Pixel desk globe and zone highlighting
src/scene-api.js            Recognition and painting client
src/pixelize.js             Painting → 960×540, 48-color pixel grid
src/avatar.js, photo.js     AI Colors client and local photo handling
src/storage.js, shared.js   IndexedDB saves and validated data contracts
assets/art                  Shipped sprite sheets and stage backgrounds
assets/ui, assets/fonts     Generated textures; OFL pixel fonts
tools/                      Asset build scripts (stages, sprites, textures)
tests/                      node:test suites
presentation.html           Ten-slide walkthrough with a live game embed
```

Asset provenance is recorded in `assets/art/README.md` and the provenance JSON
files beside the art. `submission-checklist.md` lists the remaining
student-authored work: the personal README, actual code edits and the video.
