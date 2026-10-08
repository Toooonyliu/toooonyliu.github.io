# One Cut Atlas

A pixel-art travel and sword-duel prototype. Run `npm start` and open
the printed localhost URL (default 4173; set `PORT` for another port).
`npm test` runs the tests included with this checkout; `npm run build` produces
`dist/`. The published frontend includes combat, avatar/region and save tests. The
separate backend repository contains its HTTP and model-boundary tests.

## Explore

Drag the shaded pixel globe to rotate it; use the wheel or pinch to zoom.
Choose a colored land region, or open **Destinations** for eleven Travel Zones.
**My duels** holds saved custom arenas. The game interface is English, with
controls in **Help** and an exit to the portfolio on the menu and duel screens.
Three original flagship stages are
Kyoto Rain, Cairo River Dusk and New York Underpass; eight more zones use
playable foundation presets. The approximate zones are artistic navigation,
not political boundaries. Keyboard users
can focus the globe and use arrows, plus/minus, Home and Enter. Double-clicking
an empty point opens the fighter workshop for the corresponding region.
Geography is bundled Natural Earth data, with no network/API dependency.

## Duel

- A / D or left / right arrows: move.
- W / X / S or 1 / 2 / 3: overhead, horizontal and rising blade lanes.
- Hold J to charge; release to strike. Matching simultaneous blade lanes clash.
- Hold K to guard the selected lane. A successful block earns a short counter.
- Space: backward evade, useful against vertical cuts.
- Hold C: forward duck, useful against horizontal cuts. Vertical cuts remain
  dangerous; a directional guard can cover them while ducking.
- L: quick backslash during an earned block/evade counter window.
- V: close shove; combine with backward movement to pull instead of push.
- Esc: pause. R: retry after the result.

A clean hit decides the duel. A five-second aftermath allows the victorious
player to move, turn and swing before the result screen. Hits and post-victory
swings leave persistent pixel blood on the wall and ground until retry.
Misses, blocks and shoves build temporary fatigue;
resting recovers it. The AI varies blade lanes, charging, guarding and evasion.
All four costumes use authored attack, evade, charge and hit animation frames.

The mechanics were independently rebuilt from the developer's public
[First Cut instructions](https://drasnus.itch.io/first-cut) and the user's
requested actions. No First Cut source code was supplied in this workspace;
this is not an exact reproduction of that game's code or animation timing.
Original generated asset provenance is recorded in `assets/art/README.md`.

## Photos

The fighter workshop maps local photo colors onto the player's or rival's
authored sprite frames. Choose a silhouette and adjust hair, skin, outfit and
accent colors in the live preview. Local color sampling does not recognize a
face or produce a photorealistic likeness. Regional stage art keeps its preset
palette. **AI Colors** adds GPT-assisted appearance analysis through the live
[Render backend](https://one-cut-atlas-api.onrender.com). It uses the OpenAI
Responses API with `gpt-6-luna` to return four colors and a choice among existing
outfit silhouettes. It does not generate sprite images, reconstruct a face,
identify a person or create new animation frames. The backend returned HTTP 200
for a real provider analysis of an authorized fictional test image on October 8.

The frontend's `one-cut-api-base` meta tag points to the public service URL;
the OpenAI key stays in private server environment variables, never browser code.
The connected frontend release still needs its final published-game browser check.
The free Render service can sleep, so AI Colors wakes `/health` before sending
one compressed photo to `/api/analyze-avatar`. Requests are not automatically
retried. OpenAI API usage is separate from Render hosting and can consume API
credits. Only use photos you own or have permission to send. The service is
stateless and requests provider responses with `store: false`; this is not a
promise that a third-party provider retains no data under its own policies.
Private setup is described in the
[backend repository](https://github.com/Toooonyliu/OneCutAtlas_Backend).
If AI is unavailable, existing local colors and manual customization remain
playable. This version has no accounts or cross-device cloud history.
Photos, destinations and victory progress are saved locally in IndexedDB.

## Walkthrough and submission

`presentation.html` is a separate English, ten-slide walkthrough with a live
game embed. Use arrows to move, N for notes and F for fullscreen. It supports
screen recording; it is not itself a recorded video. `prompt_log.md` preserves
19 selected actual user messages and art provenance. `submission-checklist.md` identifies
remaining student-authored README, actual code edits and recording work.
`submission-answers.md` contains first-person form drafts and an evidence-based
gap check; unresolved personal-work and video fields are not completed claims.
This technical README was updated with AI assistance and must not be presented
as the student's independently written assignment README.

The new scene prompts are saved in `assets/art/zone-v1-provenance.json`.
