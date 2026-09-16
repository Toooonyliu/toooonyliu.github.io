# Flighty, a new chapter

Independent Flighty product-design case study by Tony Liu. Updated September 15, 2026 to use the selected Flighty website visual language: a floating pill navigation, two-feature hero, dark aircraft scene, pale product cards and purple history/loyalty accents. The portfolio homepage is unchanged.

- Case study: https://toooonyliu.github.io/projects/flighty/
- Working prototype: https://toooonyliu.github.io/projects/flighty/demo/
- PRD: https://toooonyliu.github.io/projects/flighty/documents/Flighty_Travel_Profile_PRD_v1.0.pdf

## Page structure

Hero → Why Flighty → competitive tasks and selected review evidence → How might we / business hypotheses → original PRD and scope addendum → Trips → Mileage & status → on-demand prototype → proposed validation.

The page distinguishes Trips as the core concept from the more speculative loyalty pilot. Historical reviews are labeled; no representative sentiment percentages, market-share inference or measured commercial impact are claimed. The original PRD PDF is preserved byte-for-byte.

## Files and behavior

- `index.html`, `case-study.css`, `case-study.js`: static case study, no build step. Native system font; locally bundled imagery and Phosphor icons.
- `images/`: prototype captures, city images and attributed Flighty artwork. See `images/ASSETS.md`.
- `documents/`: original PRD v1.0 and dated scope addendum.
- `demo/`: static app served by GitHub Pages; includes the September 15 mileage planner and trip chronology revision.
- `source/`: synchronized prototype source, including the mileage planner and trip chronology revision. The separate Sites deployment is unchanged.
- `portfolio.css`: retained legacy style file from the earlier page; no longer loaded by this case study.

Hero tabs change phone screenshots and benefit cards. Comparison tabs switch traveler jobs. The trip chart switches distance/time and provides a data table. The loyalty chart switches three sample accounts and earned-only versus booked-estimate progress. Values mirror `source/src/domain.ts` and `source/src/loyalty.ts`; update the explanatory fixtures together if those source examples change.

Aircraft motion uses a transform of the attributed captured artwork, pauses offscreen and in hidden tabs, supports a pause control, and is disabled for reduced motion. The demo iframe and its WebGL assets load only on request. The hero is a narrated preview; full editing happens in the prototype.

## Preview

Serve the repository root with a static HTTP server and open `/projects/flighty/`. No Node packages or third-party analytics are needed by the case study itself.

## Rebuild the separate demo

Use Node 24 and npm. From `projects/flighty/source`:

```sh
npm ci
npm run build:pages
cd ..
node export-demo.mjs
```

Commit source and demo together when changing the app. The export scopes asset references to `/projects/flighty/demo/assets/` without changing the protected mobile runtime. No demo rebuild is needed for case-study edits.

## Data and verification

The prototype uses sample/manual loyalty records and local browser persistence. It has no production loyalty connection. Research context is desk research; business outcomes remain hypotheses. See `design-qa.md` for browser verification and remaining limits.

## Latest demo iteration

Mileage adds a destination/date/cabin planner, compact account rows, sample cost/goal/benefit comparison and one-program credit projections. Trip Passport adds first/final event times and chronological legs, with cross-year and unknown-time handling. The original PRD remains unchanged; the dated scope addendum identifies this planner as an exploratory extension.

No live pricing, bookings or loyalty sync: curated fares and credit packages demonstrate the interaction. The portfolio homepage and case-study layout are unchanged by this app revision. See `source/design-qa.md` for app validation.
