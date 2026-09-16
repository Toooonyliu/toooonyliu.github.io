# Flighty Travel Profile demo

An independent, interactive redesign concept. It runs in a browser using the Product Design mobile runtime. Includes the supplied 2023 flight records and labeled sample itineraries. No Flighty account, booking or cloud sync. Optional online lookup runs through a separate local server adapter.

## Run

Use Node.js 24 or another supported Vite runtime, then `npm ci` and `npm run dev -- --host 127.0.0.1 --port 4174`.

For this workspace, an official Node.js runtime was downloaded to `/tmp/node-v24.21.0-darwin-x64`. If Node is not on PATH, prepend `/tmp/node-v24.21.0-darwin-x64/bin` to PATH. Temporary runtimes can be removed by macOS; install Node normally for long-term use.

## Walkthrough

1. Start on **My Flights**. Open the upcoming PIT–ORD flight. Below the next flight, **Mileage & status** shows a “Where next?” planner and three compact loyalty account rows. **View all** opens accounts and per-flight credit; add/edit accounts, choose Reach / Retain / Save miles, and enter balances from your airline account.
2. Use the persistent **My Flights / Friends / Passport** bottom navigation. Search opens the number/date/result Add Flight flow. Friends includes onboarding, a simulated share sheet and Bobo’s sample itinerary; no invitations are sent.
3. Open **Passport**. Its year selector filters the Passport totals, delay and aircraft cards, most-flown-airline card, and Past Flights. Airline count and distance drill-downs use the exact contributing records.
4. Scroll to **Past Flights**. The new **Flights / Trips** control changes only the list view. Flights retains sorting and density controls. Trips displays compact saved journeys and reviewable suggestions. Switching views never creates a saved trip.
5. Select **2026**, then open **Review trip: Japan**, inspect its four flight legs and unrecorded HND–KIX gap, then Save Trip. Destination thumbnails, trip search, Work/Personal filters and home-airport preferences are available in the list. The review explains its grouping and keeps Save visible. Inside a saved trip, add/remove flights, rename/split/merge, label a train/car/ferry gap, enter flight credit, or add a private note/cover. Undo is available beside the change.
6. A trip spanning multiple years appears when any flown leg falls in the selected year; the row and detail show the complete journey. Ungrouped flights remain visible. Canceled and upcoming records never contribute to flown totals or mileage.
7. Return to My Flights and retrieve the previous Chicago note. Demo controls (the account-outline icon in the main header, or ellipsis in details) provide export, undo, offline/conflict/empty scenarios, departure-time switching and reset.

ANA, United MileagePlus and British Airways Club accounts are clearly labeled samples. The United status target and BA Avios savings goal are illustrative personal targets. The next-flight credit is also a sample. Accounts, balances, goals and credit amounts can be entered manually. Posted credit is already included in the entered account total and never added twice. Pending completed flights and estimated booked flights are separate, deadline-aware projections; missing amounts remain unknown. ANA Platinum has a sourced flying-only preset with both required counters; other programs use personal goals. A savings target does not guarantee a reward seat or upgrade. No live loyalty connection or automatic fare-based earning calculation is available.

## Visual scope

The September 14 user screenshots supersede the earlier custom navigation. This implementation restores the original tab structure and Passport card/list hierarchy, using a real NASA-textured 3D Earth and locally bundled airline logos. Drag the Earth to rotate it, pinch or scroll to zoom, and use the crosshair to recenter. Drag the panel header or tap its handle to expand/collapse it. The globe and panel have independent gestures. The demo profile uses a library account icon. The B737-800 card uses raster aircraft artwork extracted from the supplied reference with Image Gen; it illustrates aircraft type rather than the operating airline. Browser-rendered verification status is recorded in `design-qa.md`.

## Map correctness

The Earth uses Three.js and NASA Earth Observatory Blue Marble imagery. Latitude/longitude is converted to a shared sphere coordinate system for the surface, airports and great-circle connections. The atmosphere, day/night shading and camera are rendered in 3D. Routes and airport labels disappear behind the sphere. Missing travel uses dashed connections. Routes illustrate connections, not actual flown tracks. No generated geography is used.

Asset provenance is in `public/assets/SOURCES.md`. Airport coordinate reference: https://ourairports.com/data/ . Coordinates are rounded for a visual prototype, not navigation.

## Data and scope

Data entities and calculations are in `src/domain.ts`. Trips reference source flight IDs. Statistics and drill-down share the same filter. Mutations enforce unique flight membership. Trip actions have local Undo in the trip detail, trip list and save message, as well as Demo controls. Export includes account and flight-credit state. Each browser keeps up to 20 operations; this is not production 30-day recovery.

The original travel-note scenario remains frozen to September 10, 2026; the new search and Friends examples use September 15, 2026 to match the supplied screenshots. The near-departure switch hides historical context. Original fixtures are fictional; the four 2023 reference records and the Bobo itinerary are transcribed from the user’s screenshots.

Trip suggestions now use chronology, home airports, geographic continuity and stop duration across the loaded completed-flight records. A gap over 21 days, a journey over 35 days, a distant unexplained transfer, contradictory timing or a return home separates suggestions. Open-jaw transfers within 600 km remain explicitly unrecorded; only the user can label their transport mode. These conservative heuristics are reviewable and are not a validated production clustering model. Single-flight trips can be created manually. Offline mode and note conflicts are demonstrable UI simulations; there is no server or sync engine. Full provider integration, robust multi-device conflict resolution, bulk imports, privacy deletion service, loyalty pilot and production grouping are outside this demo.

## Checks

- `node --test tests/domain.test.mjs tests/reference-data.test.mjs tests/frequent-flyer.test.mjs` — semantic data invariants and geography checks.
- `npm run check:runtime` — protected mobile runtime integrity.
- `npm run build` — TypeScript, Vite and packaged static output.
- `npm run test:runtime` — browser interaction suites (requires a Playwright browser).
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/flighty-playwright npx playwright test tests/travel-flows.spec.ts tests/earth-visual.spec.ts --workers=1` — travel regressions, mouse orbit, zoom/recenter, touch pinch, panel dragging and airline assets on both phone presets.

Visual and interaction verification status is recorded in `design-qa.md`.

## September 15 reference flows

- **Search:** airline/airport/flight number lookup, date text (today, tomorrow, weekday or calendar date), calendar picker, route search, results, duplicate prevention and manual entry. Try UA123 → Today → London to Newark → View My Flights. Sample results are marked; unmatched searches have an empty state. Calendar account sync is explicitly unavailable in this local prototype.
- **Friends:** Add Friend → Flighty Friends → Continue → simulated sharing sheet → Add sample friend Bobo. The Bobo tab opens the profile and five-flight itinerary; each flight opens details. Connections are calculated in UTC: 21h 18m at SAN and 1h 15m at LAS. Everyone/Today filters work; Today is empty for the reference date. Add/remove persists locally. Copying the demo preview link opens the invitation preview, without automatically connecting a friend or sending a message.
- **Passport:** defaults to 2023. Four records feed counts, duration, airline ties, aircraft totals and every Past Flights grouping. Date / From / To / Airline / Aircraft group labels and counts follow the screenshots; repeated taps reverse ordering. Detailed rows show duration, aircraft code and registration. The original Flights/Trips switch remains.

### 2023 provenance

| Metric | Value | Basis |
| --- | --- | --- |
| Flights / airports / airlines | 4 / 4 / 2 | Calculated from four source records |
| Flight time | 30h 46m; compact card 1d 7h | 802 + 94 + 703 + 247 minutes; compact display rounded to nearest hour |
| Total distance | 23,511 km | Reported aggregate in the screenshot, used only when all four source records are included |
| Delay / displayed average | 9 minutes / 4 minutes | Reported screenshot values; per-flight delays and averaging denominator were not supplied |
| Most flown aircraft | B777-300 ER, 2 flights | Calculated from source aircraft types |
| Most flown airline | Cathay Pacific and Japan Airlines, 2 each | Calculated tie, both shown |

Per-flight distance is a clearly labeled great-circle estimate, not an allocation of the reported total. Partial airline-distance totals therefore need not add up to the reported aggregate. Exact departure/arrival times and missing delays remain unknown; source dates, aircraft codes and registrations are preserved as supplied. The B777 illustration is reference-derived. Future live/manual records retain their own provenance; unknown durations are not treated as measured zeroes.

### Optional online lookup

The adapter uses aviationstack’s flight endpoint: https://aviationstack.com/documentation . It requires your server-side API key and a plan that supports the requested dates. Copy `.env.example` to `.env.local`, set `AVIATIONSTACK_API_KEY`, then run `npm run dev:flights` alongside the preview on port 4174. The key is never bundled into the browser. The browser checks adapter status at `http://127.0.0.1:4175`; without a configured key it uses labeled local samples. The adapter is already running in sample mode for this session.

The live adapter has timeout/error handling, bounded caching, response normalization and unsupported-airport reporting. It currently covers airports in the demo registry and up to the first 50 provider results. It has not been verified against a paid/live account. Scheduled provider times are not actual measured flight durations, and route distances remain estimates. Friend sharing, calendar sync, loyalty eligibility and live tracking remain prototype-only. The public web demo uses local sample lookup and never contacts a visitor’s localhost. External invitations are not sent.

Reference verification: `node --test tests/domain.test.mjs tests/reference-data.test.mjs tests/frequent-flyer.test.mjs tests/reference-data.test.mjs` and `npx playwright test tests/reference-flows.spec.ts --workers=1`. Source/implementation comparisons are under `qa/sept15/`.

## Individual flight detail reference

Open **Passport → 2023 → CX 882**. Its detail page now uses a draggable map-backed panel with a pinned route header, distance/status banner, local actual and scheduled clocks, gates/terminals, editable booking/seat/notes, historical arrival/weather/connection information, aircraft, detailed timetable, airline information, route history and the visible update from the source. Share copies/downloads a summary without private fields; Report Data Issue downloads a draft and sends nothing.

New supplied facts replace the former estimates for CX 882: **11,662 km**, **16:51 HKG departure**, **15:13 LAX arrival**, **3m arrival delay**, **6m departure delay**. Gate-to-gate duration is **13h 22m**; air time is **12h 54m**. The 2023 delay card still totals the reported **9 minutes**, with CX 882's known 3 minutes included once. The other three 2023 flights retain estimated individual distances and unknown individual delays/times. The earlier provenance notes above should be read with this update.

UA 821, August 21, 2026, is also now in the reference dataset, using the earlier user screenshot's 21:41 HKG / 20:28 LAX clocks, 13h 47m, 11,662 km, 8m arrival delay and N26970 / B787-9. Route history therefore calculates **2 flights, 23,324 km, 27h 9m**, and United's source count increases by one.

The supplied snapshots contain two inconsistencies: the displayed arrival taxi duration is 8 minutes although the rounded 15:04–15:13 clocks differ by 9; the aircraft card says one flight on B-KPX while the supplied 2023 list associates two flights with that registration. Timetable values are retained as displayed; the aircraft count is calculated from the records, with the discrepancy explained in its detail sheet. The 60-day forecast is a historical snapshot, not a current forecast. Only one of the reported 15 updates was supplied, so the remaining updates are not invented.


## Public web demo and Passport refresh

A hosted static web app is the preferred review format: share one HTTPS URL, with no installation or server instructions. The app includes iPhone and Pixel device previews and runs entirely in the visitor’s browser. Each visitor has separate local storage; changes are not shared with other visitors. The original React/Vite mobile runtime is retained and packaged by the existing Sites Worker build.

- Mileage: three sample accounts; edited accounts survive migration. Program changes reset balances to avoid reinterpreting old amounts in another program’s units.
- Trips: the globe fits the current journey’s great-circle routes. Short domestic journeys zoom close; transpacific journeys fit their full span. Map markers retain readable screen size. Arrow keys rotate, plus/minus zoom, and Home recenters.
- Trip Passport: calendar days (start-airport timezone), completed flights, distance, recorded duration, airports, airlines, countries/territories touched, Earth comparison, and full statistics. Planned/canceled flights are excluded from flown totals; unrecorded surface travel remains explicit.
- All-time Passport: purple geographic cover, period selector, flight frequency charts, distance/time records, airport visits, airline/route rankings with Flights/Distance controls, country lists and region counts. Expand rankings to inspect source flights; share buttons download only the selected statistics, with no private trip notes or account balances.
- Current loaded all-time data: **15 completed flights, 72,674 km, 10 airports, 6 airlines, 5 countries/territories touched**. **94h 53m** is partial time (14/15 durations supplied). The screenshots show a 75-flight account; the remaining flight records have not been supplied and are not invented.
- The six city thumbnails total 226 KB as WebP, down from 14.5 MB PNG. Original images remain in local QA storage only.

Before production: import the full flight history; integrate authenticated airline balances/earning rules and flight data; add secure cloud synchronization and recovery. Current online search is a clearly labeled sample catalog/manual-entry demo. WebGL image resolution limits very close zoom; full VoiceOver/TalkBack and older mobile GPU testing remain future validation.


## Mileage planner and journey recap — September 15, 2026

From **My Flights → Mileage & status → Tokyo**, choose travel dates and cabin, then compare. **Lowest cost** starts with United; **My goal** with the ANA goal puts ANA first because both Premium Points requirements improve. Open an option to see usable sample benefits, one credited program, redeemable earnings, current → proposed → after progress, remaining counters and potential next-tier benefits. Change cabin, goal or nonstop filter to explore the tradeoff. Comparing never saves a booking or changes balances.

Supported scenario library: PIT or SFO to HND (Tokyo), LHR (London), and ORD (Chicago; Economy only). Prices are fictional USD cash fares for one adult, with listed bags and taxes included. Dates affect qualification periods and membership validity, but do not drive live inventory or price changes. Cabin-specific credit values are fixtures, not airline fare-class formulas. Each direction uses a single scenario credit package; real segment-level earning rules are deferred. Detailed per-segment schedules, live fares, booking, award availability and an exhaustive benefits catalog are outside this prototype.

**Passport → All-Time → Trips → Chicago → Trip summary → Explore statistics** now starts with Your journey. Each chronological leg opens its original flight. The New York trip spans 2025–2026 and excludes its canceled leg; Japan keeps its HND–KIX surface gap. Times distinguish sample, entered, reported and screenshot-recorded gate events; unavailable times are not inferred. All-time/year frequency charts remain.

Validation: `node --test tests/*.test.mjs` (42 cases), `npm run build`, and `node scripts/planner-journey-qa.mjs` with an installed Playwright browser. The browser script accepts `DEMO_URL` for static-preview or deployed checks. See `design-qa.md` for visual evidence and remaining production limits.
