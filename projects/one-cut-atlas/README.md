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
**Fight**, **Mode & Controls**, **Send a postcard**, **Fighter**, **Destinations** and
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

**Fight** opens the mode and input selection screen before each duel. Choose
**Single player** against the AI, or **Local two-player** on the same screen.
Each human can use keyboard + mouse or a browser-standard gamepad. Local play
supports keyboard + gamepad in either player order, or two separate gamepads;
sharing one keyboard or one pad between players is intentionally not supported.
Both human fighters have identical movement and combat timings. Local wins do
not award solo destination stamps, and AI difficulty applies only to solo mode.

Input-type cards always let you choose keyboard + mouse or gamepad, even before
a controller is connected. Settings can be saved offline; starting or restarting
a duel still requires every assigned controller to be available and supported.
Connect controllers and press a button so the browser can discover them, then
choose the detected device or click **Press A to assign a controller** and press
A on the intended pad. Assignment requires a fresh press and does not silently
take a controller from the other player.

Each player's controls are shown as an authored SVG keyboard + mouse or Xbox-style
controller diagram with colored buttons and a compact action legend. Full key
aliases and PlayStation equivalents remain in the expandable binding list.
Xbox / PlayStation button names are shown together; support depends on the
browser exposing a standard gamepad mapping. Detected but unsupported/raw devices
are listed explicitly, not hidden or mislabeled as disconnected. Connection help
distinguishes an empty device list from browser access being blocked; the visible
device report stays on the page and is never uploaded. Unsupported or disconnected
pads cannot start a duel. Settings are remembered locally; reconnect/reselect pads
if the browser assigns them different device numbers.

Open **Controls** during a duel to pause and inspect bindings. Applying settings
restarts the duel; Cancel preserves it paused, then **Resume** continues.
Disconnecting an assigned pad or leaving the tab pauses combat. Reconnect and
resume explicitly, releasing held controls before acting again.

### Keyboard + mouse

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
| M | Toggle music and effects |

### Gamepad (Xbox / PlayStation labels)

| Input | Action |
| --- | --- |
| Left stick ← / → | Move |
| D-pad ↑ / ← or → / ↓ | High / mid / low blade line (latched) |
| A / Cross | Hold to charge; release to strike |
| X / Square | Hold to guard |
| B / Circle | Evade |
| LB / L1 | Hold to duck |
| Y / Triangle | Counter |
| RB / R1 | Shove; with backward movement, a pull |
| Start / Options | Pause / resume |
| Back / Share | Rematch after the result |

The mouse line has a little hysteresis and only changes while you are free to act, so a drifting hand never withdraws a cut; line changes on the keyboard can still feint on purpose. Add `?debug` to the URL to expose the live duel engine for automated playtests.

One clean hit decides the duel. **Standing in the same line as an incoming cut
blocks it**, so the duel is about reading which line the opponent leaves open.
Matching simultaneous cuts clash. Misses, blocks and shoves build temporary
fatigue. The computer opponent reacts to visible wind-ups after a human-like
delay, aims at the open line more often on harder difficulties, and can be
baited by a feint.

The decisive cut freezes for a beat, flashes white, throws a heavy spray, and
the loser staggers before falling; the winner holds the follow-through and
keeps control for a five-second aftermath. Preset duels now use the supplied
layered classic fighter art: 16-frame walks, 12/13-frame cuts, 6-frame evasions
and a 25-frame fall. Those layers are flattened into small cache frames before
play, keeping the measured browser loop at 60 FPS instead of cropping eight
large atlas regions per fighter on every frame. Photo-colored custom fighters
continue to use the palette-aware One Cut Atlas sheets.

The deterministic duel rules remain an independent browser implementation;
no native First Cut code was copied. The layered fighter pixels, music,
ambience and selected combat effects were imported from the user-supplied
local `First Cut Browser Game` reference build. See the asset READMEs for exact
scope and provenance, and confirm redistribution rights before publishing.

## Project layout

```
index.html, src/style.css   Desk menu, dialogs, duel HUD
src/app.js                  Screens, photo gate, input, duel loop
src/engine.js               Deterministic fixed-step duel rules and AI
src/duel-setup.js           Mode/device selection and per-player binding cards
src/control-diagrams.*     Scalable keyboard/mouse and controller illustrations
src/controller-discovery.js Device discovery, diagnostics and offline preferences
src/controllers.js          Standard gamepad mapping and device validation
src/duel-inputs.js           Independent player routing and pause input safety
src/art.js, src/render.js   Palette sprites, cached animation, effects, stages
src/classic-fighter.js      Layered classic animation adapter and frame cache
src/combat-audio.js         Predecoded effects, music and ambience
src/globe.js                Pixel desk globe and zone highlighting
src/scene-api.js            Recognition and painting client
src/pixelize.js             Painting → 960×540, 48-color pixel grid
src/avatar.js, photo.js     AI Colors client and local photo handling
src/storage.js, shared.js   IndexedDB saves and validated data contracts
assets/art                  Shipped sprite sheets and stage backgrounds
assets/classic              Supplied layered fighter atlas subset + manifest
assets/audio                Supplied music, ambience and combat effects
assets/ui, assets/fonts     Generated textures; OFL pixel fonts
tools/                      Asset build scripts (stages, sprites, textures)
tests/                      node:test suites
presentation.html           Ten-slide walkthrough with a live game embed
```

Generated-art provenance is recorded in `assets/art/README.md` and the
provenance JSON files beside the art. Supplied reference assets are documented
separately in `assets/classic/README.md` and `assets/audio/README.md`.
`submission-checklist.md` lists the remaining
student-authored work: the personal README, actual code edits and the video.

## Input regression checks

`npm test` includes two-human combat, gamepad mapping, assignment validation,
and pause/resume input tests. With the local server running, macOS developers
with Google Chrome installed can run:

```sh
node tools/local-duel-smoke.mjs http://127.0.0.1:4173/
node tools/controller-picker-smoke.mjs http://127.0.0.1:4173/
```

This browser check injects simulated gamepad snapshots and exercises the real
setup screen and game loop. It does not replace testing physical controllers.
