# Kangaroo Crossing

A Crossy Road-inspired browser game by Tony Liu, use Kiro as a platform and GPT-6 to co-developed.

## Play

Open `index.html` in a browser. Arrow keys or WASD move; P pauses and R restarts. Touch controls support mobile play. Click Play to enable synthesized audio; Sound on/off mutes it.

Score increases by one for each new furthest row reached. Cars, landing in open water, drifting out of bounds, or falling behind the scrolling screen end the run. Jump onto logs and lily pads to cross lakes. Restart begins a new run; your personal best is saved in your browser.

## AI tools and development strategy

Tony reports using Kiro as the platform and GPT-6 as the model. This conversation also used the Codex assistant and its coding tools. See `prompt_log.md` for the original prompts.

Development proceeded incrementally: plan the core game, build a playable HTML prototype, then refine scrolling, characters, vehicles, lakes, voxel-style rendering, animations, and synthesized audio before publishing. The recorded conversation builds on its first prototype; it does not establish whether any separate in-class code was reused.

## Known limitations and verification

Game logic and audio scheduling received automated checks, and the public deployment was verified. A complete live-browser playtest with console inspection has not been documented in this conversation. No remaining gameplay-breaking defect has been confirmed; this is not a guarantee that the game is bug-free.

## Implementation

- `game.js`: terrain, movement, collisions, scrolling, and game states
- `renderer.js`: Canvas-based orthographic voxel rendering and animation
- `audio.js`: original Web Audio music and sound effects
- `style.css` and `transitions.css`: responsive layout and title animations

Static HTML, CSS, and JavaScript; no build or server required.
