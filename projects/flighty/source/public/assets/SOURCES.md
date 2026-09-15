- earth/day.jpg: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/september/world.topo.bathy.200409.3x5400x2700.jpg
- earth/night.jpg: https://threejs.org/examples/textures/planets/earth_lights_2048.png
- earth/clouds.jpg: https://threejs.org/examples/textures/planets/earth_clouds_1024.png
- airlines/UA.png: https://www.gstatic.com/flights/airline_logos/70px/UA.png
- airlines/NH.png: https://www.gstatic.com/flights/airline_logos/70px/NH.png
- airlines/BA.png: https://www.gstatic.com/flights/airline_logos/70px/BA.png
- airlines/DL.png: https://www.gstatic.com/flights/airline_logos/70px/DL.png
Earth imagery: NASA Earth Observatory. Airline logos identify the corresponding airlines in this independent prototype.

## Aircraft card artwork

- `aircraft/b737-800.png`: derived from user-provided `qa/reference/original-04.png` using the built-in Image Gen tool. Used as an aircraft-type illustration only; the pictured livery does not represent fixture flight membership. Source and generated outputs remain preserved.
- Final extraction/edit prompt: “Change ONLY the background of this extracted aircraft asset. Replace the entire gray checkerboard with perfectly flat pure white #FFFFFF. No checkerboard, no gray, no texture, no shadow, no gradient. Preserve the plane itself exactly, including the Southwest lettering, blue red yellow livery, orientation, geometry and wide composition. Keep pure white background to the corners. Tight crop with only a small white margin.”
- Initial extraction prompt requested only the reference card's aircraft, preserving livery, orientation and geometry while removing the surrounding UI. Its transparency attempt was rejected during visual review; the selected white-background asset is blended into the aircraft card.

## September 15 assets

- `airlines/CX.png`, `JL.png`, `WN.png`, `AS.png`: downloaded from `https://www.gstatic.com/flights/airline_logos/70px/{IATA}.png`. These are actual airline identifiers; the current Alaska mark differs from the older portrait mark in the reference.
- `flags/{us,jp,hk,cn,gb}.png`: `https://flagcdn.com/w80/{country}.png`.
- `friends/onboarding.png`: Image Gen extraction/reconstruction of the decorative Friends illustration from user screenshot `qa/sept15/reference/reference-12.png`. Prompt: extract only the existing globe and Mom/Jenny/Mike flight-update artwork, preserve composition and geography, remove surrounding UI, use a #19191B background. This is onboarding artwork, never the interactive geographic map.
- `aircraft/b777-300er.png`: Image Gen extraction of the plain white B777-300 ER from `qa/sept15/reference/reference-13.png`. Prompt: extract only the aircraft, preserve geometry, camera angle and unbranded white livery, remove all card text and UI, place on pure white background. The asset is blended into the pale aircraft card.

Both extracted images were visually inspected in isolation and in the rendered UI. Originals remain in the reference folder; actual map imagery remains the NASA/Three.js assets listed above.

## Individual flight artwork

- `aircraft/b777-stars.png`: extracted/reconstructed with Image Gen from the user's `qa/flight-detail/reference/06.png`. Prompt: extract only the white Boeing 777-300 ER side-view illustration and dark navy/charcoal star field as a 3:1 landscape asset, preserve aircraft geometry/orientation, remove all UI/text/borders, span 94% of width with space above tail and below engines. Output preserved at `/Users/tonyliu/.codex/generated_images/01a09e84-97f5-7940-9b27-106c8c09ec5d/exec-46a4eb31-e7ed-4ae7-aba6-02871365721f.png`. Inspected before use. The source screenshots remain in `qa/flight-detail/reference/01.png` through `08.png`.

## Frequent-flyer destination thumbnails

Generated with the built-in Image Gen tool for this prototype, September 15, 2026. Decorative editorial city imagery; not geographic data or an actual trip photograph. All six images were inspected at full size and in 56px rounded trip rows. Personal uploaded covers take priority.

Shared art direction/prompt summary: square, full-bleed photoreal editorial destination photo for a charcoal Flighty trip row; blue-hour indigo/violet atmosphere, restrained warm golden lights, strong recognizable landmark silhouette readable at 56px; no people, text, logos, UI, frames or watermarks.

| Bundled file | City / subject | Original generated output |
| --- | --- | --- |
| `destinations/tokyo.png` | Tokyo Tower and skyline | `/Users/tonyliu/.codex/generated_images/01a0a3bb-a9f3-79c3-a2f4-21168f43d966/exec-04ad831a-ae67-4480-a69c-c576f7992404.png` |
| `destinations/hongkong.png` | Victoria Harbour / Bank of China skyline | `/Users/tonyliu/.codex/generated_images/01a0a3bb-a9f3-79c3-a2f4-21168f43d966/exec-7c947d95-0769-45cd-be5e-ed0186475f13.png` |
| `destinations/chicago.png` | Chicago River and skyline | `/Users/tonyliu/.codex/generated_images/01a0a3bb-f010-7f03-8f28-df498d78c156/exec-9e54ae50-9233-4b2f-96be-7e8736e2e3b9.png` |
| `destinations/newyork.png` | Empire State Building and Manhattan | `/Users/tonyliu/.codex/generated_images/01a0a3bb-f010-7f03-8f28-df498d78c156/exec-564f8787-eedd-4257-92fe-062348a60c4f.png` |
| `destinations/london.png` | Tower Bridge at blue hour | `/Users/tonyliu/.codex/generated_images/01a0a3bc-34e0-7f63-81df-51387d26194d/exec-e8cc0ddc-de6b-4e0b-a754-b3e248772426.png` |
| `destinations/losangeles.png` | Downtown Los Angeles skyline and palms | `/Users/tonyliu/.codex/generated_images/01a0a3bc-34e0-7f63-81df-51387d26194d/exec-e0c1fb90-bacd-451f-b651-3e746d1fdbb0.png` |

## Loyalty terminology and rule sources

Checked September 15, 2026. These support terminology and the explicitly labeled ANA preset, not a claim that this prototype verifies every program condition or a ticket's earnings.

- [ANA Premium Points and status](https://www.ana.co.jp/en/jp/amc/premium/overview/premium-point/): separate Premium Points from redeemable miles; flying-only Platinum requires 50,000 total with 25,000 ANA Group points.
- [British Airways tier points](https://www.britishairways.com/content/en/ca/the-british-airways-club/about-tier-points): tier points are distinct from redeemable Avios and have a collection period. BA goals/deadlines remain manual in this demo.
- [Cathay Status Points](https://www.cathaypacific.com/cx/en_US/membership/status-points.html): status currency terminology; no automatic Cathay qualification logic.
- [JAL FLY ON](https://www.jal.co.jp/jp/en/jalmile/flyon/guide.html): FLY ON Points terminology and credited-program dependence.
- [Delta qualification](https://www.delta.com/us/en/skymiles/medallion-program/how-to-qualify): Medallion Qualification Dollars terminology.

The United PQP/PQF labels are for a user-defined goal, not a complete Premier eligibility calculator. The demo does not infer currency or status earnings from distance, check reward inventory, link accounts, or send user travel data to airlines.

## Passport refresh

- Moon comparison: NASA Moon Facts, https://science.nasa.gov/moon/facts/ (384,400 km average Earth–Moon distance), checked September 15, 2026.
- Passport map: Natural Earth via world-atlas land-110m, projected from geographic coordinates. Route paths and markers are computed from the included airports.
- Destination `.webp` files are 384×384 delivery copies of the previously generated city images. Original PNGs retained locally in `qa/destination-originals`, excluded from publishing.
- United MileagePlus and British Airways Club example balances/targets are illustrative personal goals, not program qualification thresholds or award quotes.
