# Mobile Prototype Agent Guide

## Prototype Instructions

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.

## Flighty demo decisions

- Approved visual: combined map-on-top layout and destination title with a chronological flight timeline, from the September 10 ideation set.
- Do not use generated map imagery: the user explicitly rejected incorrect airport locations. Use Natural Earth geography and coordinate-driven projections for land, route arcs and airport markers.
- Preserve dark surfaces and purple Passport identity; operational status remains green.
- The demo is standalone, with fictional records and local browser persistence. Freeze scenario time to September 10, 2026 so the upcoming flight stays reproducible.
- Keep all four Japan flight legs separate. HND to KIX is unrecorded travel, not an inferred flight.


## September 14 scope correction (user-approved)

- The supplied September 14 screenshots supersede the previous top-level Overview / Trips redesign. Preserve My Flights, Friends, Passport in the bottom bar, with a separate Search button; open My Flights by default and prioritize the next flight.
- Preserve the Passport year selector, summary, delay and aircraft cards, and Past Flights list. Add Flights / Trips only underneath Past Flights. Switching view must not save suggestions or mutate flight membership.
- Grouped trips reuse compact rows, with review required for suggestions. Keep original flight details and existing trip notes/editing reachable.
- Add most-flown airline by selected period in Passport, with source-flight navigation. My Flights adds mileage per airline and independent, clearly labeled sample reward progress. Flight distance must never stand in for qualifying rewards or real eligibility; no real loyalty programs or thresholds are claimed.
- Retain the geographically grounded map. The web demo uses a simplified Natural Earth globe, not the original app's satellite imagery. User screenshots define the original app structure; do not replace its navigation again to expose more demo features.

## Approved globe and visual revision

- The user explicitly approved keeping the current feature/navigation structure and changing visual presentation only, including a draggable globe behind a draggable content panel and actual airline logos.
- The earlier simplified Natural Earth renderer is superseded by a Three.js sphere using real NASA Earth Observatory imagery. Airport coordinates and route geometry remain factual; never generate Earth geography with image generation.
- Use mouse/touch orbit, wheel/pinch zoom, momentum, and recenter. Keep globe gestures separate from panel dragging and content scrolling. The top-level panel has expanded, resting and peek positions, with a keyboard-operable handle.
- Actual locally bundled UA/NH/BA/DL logo assets replace letter badges. Preserve image aspect ratio and use accessible airline names.
- Playwright browser verification is explicitly approved for this revision and follow-up verification within this task. No further permission request is needed for its screenshots and tests.

## September 15 functional references

- Extend the existing structure with the supplied Add Flight number/date/result flow, route search and manual entry. Added records persist locally and feed My Flights and Passport; prevent duplicate flight/date additions.
- Match Friends onboarding and sharing presentation, and provide Bobo's sample itinerary, individual friend selection/detail and flight detail. Invitations in the local prototype must be clearly simulated; do not send messages automatically.
- Import the four 2023 flights exactly as shown in the user's screenshots. Preserve date, number, airline, duration, type and registration. Exact timestamps and per-flight distances/delays were not supplied: do not fabricate them. Distinguish screenshot-reported aggregate totals from calculated values and route-distance estimates.
- Past Flights Date/From/To/Airline/Aircraft controls group records with correct headings/counts, reverse group order on second tap and retain compact/detailed rows. Keep the approved Flights/Trips switch.
- The latest screenshots are stored in qa/sept15/reference. This is a continuation of the approved browser verification scope.

## Individual flight details reference

- The user supplied the expanded CX 882 flight detail screenshots. CX 882 on August 31, 2023 now has reported 11,662 km, actual gate departure 16:51 HKG / arrival 15:13 LAX, 802 total minutes and 3 arrival-delay minutes. Scheduled gate times are 16:45 / 15:10; departure delay is 6 minutes.
- Keep air time (12h 54m) distinct from gate-to-gate total time (13h 22m). Preserve the source timetable's displayed rounded taxi values rather than silently changing them.
- Add the UA 821 August 21, 2026 record visible in the route history and earlier screenshots. HKG–LAX route history is two flights, 23,324 km and 27h 9m. Restrict the 2023 aggregate substitution to the four 2023 reference IDs; never absorb the 2026 record into that substitution.
- Use the original map-backed draggable detail panel, fixed airline/route header, status strip, airport clocks, timetable, aircraft, airline and history cards. Notes/booking/seat edits are local. Sharing excludes private notes/booking/seat; reporting prepares a downloadable draft and sends nothing.
- Arrival forecast, weather, connection guidance and visible updates are historical screenshot snapshots, not live data. The two B-KPX records in the supplied history produce a count of two despite the source detail screenshot saying one; explain that discrepancy rather than fabricating data.

## Approved frequent-flyer revision

- The user approved the Mileage/Trips recommendations from `qa/frequent-flyer-audit/report.md`, plus coordinated destination thumbnails. Preserve navigation, original reference records, and the next-flight priority.
- Loyalty now belongs to the credited program, independently of the operating airline and geographic distance. Separate redeemable currency (Avios for BA), status counters, deadline and Reach/Retain/Save goals. Balances and credits are manual/sample, with visible source and update date; never imply a live connection.
- ANA flying-only Platinum uses 50,000 Premium Points including 25,000 ANA Group points, sourced in `public/assets/SOURCES.md`. Other goals are user-entered and do not guarantee full qualification or reward availability. Posted credit is included in the entered account total; only eligible pending/booked estimates add to projections. Unknown is not zero.
- The old sample-benefit fixture is superseded in the UI by `loyalty.ts` and `LoyaltyPanel.tsx`. Store optional new fields so previous saved travel data remains compatible.
- Suggest trips from completed-flight chronology, multiple home airports, location continuity and stop duration. Suggestions do not mutate records. Keep ambiguous surface segments explicit, support add/remove and split/merge with Undo, and search destination/date/note.
- Destination artwork is decorative, generated city photography, never map geography. Use accurate city mapping, personal covers first and a library destination avatar for unmapped cities. Match dark charcoal/purple visual identity.
- Review actions stay outside MobileScroll, follow `useKeyboardInsets().bottomInset`, dismiss keyboard on selection/save/cancel, and extend their background through the lower safe area.


## Approved public Passport and trip iteration

- User explicitly requested a public web demo that anyone can check online. Publish the validated existing mobile runtime through Sites; preserve iPhone/Pixel previews. Source `.openai/hosting.json` identifies the one Site. Never publish QA screenshots, private source references or local secrets as app assets.
- Add United and BA sample mileage accounts alongside ANA. Targets are illustrative personal goals; preserve edited accounts and stable IDs. Public hosts must not probe visitors’ localhost flight adapters.
- Trip Earth cameras fit all non-canceled route geometry at the viewport aspect ratio, with readable map markers. Trip summary and detail statistics must derive from original flight IDs.
- Supplied September 15 all-time Passport references (local `qa/passport-refresh/reference`) define purple cover/header, flat geographic map, charcoal stats sections, purple charts and blue Show More. Loaded data remains 15 completed records; do not imitate the screenshot’s 75-flight totals without the source records. Missing flight duration is partial, never exact. Keep geographic distance separate from loyalty.


## Approved mileage planner and trip chronology revision

- Keep My Flights' next flight first. Mileage & status now offers a destination entry and three compact account rows; View all retains full account and flight-credit editing.
- Add a what-if cash-fare planner with origin, destination, dates, cabin, nonstop filter and cost/goal/benefit priorities. Curated PIT/SFO → HND/LHR/ORD offers are illustrative scenarios, never live prices, availability or airline earning rules. Unsupported routes/cabins have explicit empty states.
- Show credit to one selected program, redeemable earnings separately from qualification counters, all required counters and period boundaries. Do not alter balances, booked estimates or flight records while comparing. Compare normalized progress within the selected goal, never raw points across currencies.
- Current tier and validity are optional explicit account fields; never infer a tier from points. Only seeded sample benefits are modeled. Manual/unknown/expired membership does not promise perks. Next-tier benefits require airline confirmation and activation.
- Trip Passport replaces its frequency chart with first departure, final arrival and chronological flight events in airport-local dates/time zones. Keep all-time/year charts. Preserve cross-year dates, canceled-flight exclusions, unknown times, surface gaps and original-flight drill-down. Do not relabel gate times as takeoff/landing.
- This planner expands the original PRD's manual loyalty pilot; record it as an exploratory scope addition, with live search/booking and full benefit-rule integration deferred.

## Approved calculated earnings revision (September 16)

- Passport starts on All-Time and tapping its main navigation tab resets the period to All-Time. Preserve a chosen year on drill-down/back.
- Replace fixed planner earning packages with published base earning formulas for explicit fare-class/ticket assumptions. Keep fares illustrative, distinguish sector mileage from credited miles, disclose approximate distance/FX/tax assumptions and excluded tier/card bonuses. Never label an unbooked calculation as posted or guaranteed earnings.
- Show eligible saved-program earnings on every option, including BA Avios on JAL when the selected ANA goal is ineligible. Ranking still uses only the selected goal.
- Purple denotes entered current credit and yellow denotes this proposed trip. Label both with quantities; show all required status counters. Do not mutate accounts.
- Link to official airline booking sites. United revenue-based credits require a United-issued ticket, so that choice links to United even on an ANA-operated itinerary.

## Approved policy and journey hierarchy revision (September 16)

- Tony approved `research/flighty/sept16-ux-review/review.md`: implement and publish the Mileage/Trips revisions and corresponding portfolio narrative to the existing GitHub Pages project.
- Mileage entry uses Frequent routes for the example travel history; Last searched appears only after a completed local search. It is a convenience preference, separate from flight and account records.
- Compact account rows show attained tier badges, a benefit preview, balance and remaining goal/deadline. Full cards prioritize current membership benefits; editing is an explicit action, not a whole-card tap.
- `benefitPolicy.ts` supersedes the earlier sample-only benefit fixture. Recognized manual and sample tiers use the same dated official policies, contingent on entered validity and operating carrier. Supported policy coverage is intentionally bounded; no universal eligibility claim.
- Distinguish included benefits, conditions/extra steps and paid or points-funded lounge entry. ANA Bronze is not free lounge access or Star Alliance Gold; BA Bronze on JAL uses Ruby benefits, not BA-only seat timing. Crediting a program does not transfer status.
- Tier badges never derive from numerical progress. Preserve purple current credit and yellow proposed credit. Personal savings/flying goals do not qualify a traveler automatically.
- Benefit sorting prioritizes route coverage by a recognized current tier, then cost, with an explanation; do not rank using a raw count of perks as monetary value.
- Trip overview promotes first departure, final arrival and expandable flight legs before the Passport summary. Keep the focused globe, original-flight access, editing, surface gaps, missing data and Undo. Trip dates show both years for cross-year journeys; route labels include the origin.
- Refresh portfolio captures/copy and the dated PRD addendum. The original PRD stays unchanged. Usability/retention outcomes remain proposed validation, not measured success.
