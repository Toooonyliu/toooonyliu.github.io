# Passport and trip refresh — September 15, 2026

final result: passed

## Evidence and comparison

- Source visual truth: `qa/passport-refresh/reference/01.png`–`09.png`, supplied in the current user request. All 9 originals are 1206×2622.
- Implementation: `qa/passport-refresh/after/01-accounts.png`–`14-japan-passport.png`; final capture updates `05-passport`, `06-flights`, `07-distance`, `08-time`, `09-airlines`, `10-countries`, `11-chicago`, `13-japan`.
- Viewport: browser 1400×1200, iPhone screen 393×852 at scale 1. Reference normalized to 393×852; comparison PNGs 786×852 with reference left/current right.
- Combined full-view evidence: `qa/passport-refresh/compare-cover.png`, `compare-flights.png`, `compare-distance.png`, `compare-airlines.png`, `compare-countries.png`, each opened and inspected. The detail views start at the relevant section; countries reference also shows the preceding route tail, which is intentionally not used to judge section offset.
- Readable 1:1 screen comparisons make the typography, controls, flight rows and bars legible without extra crop images. Trip maps separately inspected in `after/11-chicago.png` and `after/13-japan.png`.

## Findings and fixes

- P1 baseline: fixed-radius trip globe hid short routes. Added route/frustum fitting and retained full transpacific span. Chicago camera distance 1.16 vs previous 3.6.
- P1 baseline: all-time stats opened a small prose sheet. Replaced with purple geographic Passport cover, fixed period header and working statistics sections.
- P2 iteration 1: close-zoom airport markers were oversized. Markers now scale to approximately 3 screen pixels of radius.
- P2 iteration 1: fun-summary and average-distance text inherited low-contrast paragraph styles. Applied scoped light text; verified in final trip/distance captures.
- P2 iteration 1: excessive chart control margin and absent section sharing. Tightened chart controls; added working summary downloads styled as the reference Share pills.
- P2 functional: old migration could duplicate an edited sample account ID. Preserve stable IDs and program matches; no edited balance replacement.
- P2 hosting: local flight adapter probing on public origins. Public demo now uses sample/manual flow without requests to visitor localhost.

## Required fidelity surfaces

- Typography: system mobile font retained; cover uses regular-weight passport title, strong numeric hierarchy, muted units and readable labels. Counts and strings deliberately follow loaded records.
- Spacing: purple fixed header/period rail, wide map and flags, two-column passport metrics, full-width dark divided sections. No app-owned fixed controls are hidden by viewport overflow.
- Colors: deep purple cover/header, purple chart bars, charcoal surfaces, blue Show More, light body text. Original green flight status styling retained elsewhere.
- Images: Natural Earth geographic map with coordinate-driven routes; real airline and country assets. City WebP thumbnails are existing artwork optimized without changing subjects. No generated geography. Passport app icon uses the established airplane library icon; original screenshot's branded app tile and decorative serial strip are not copied.
- Content: 15 completed flights / 72,674 km / 10 airports / 6 airlines / 5 countries and territories. 94h 53m is labeled partial, time coverage 14/15. Reported 2023 total remains 23,511 km. Region totals do not invent world-country denominators; Moon comparison uses verified average distance. Missing air/taxi breakdown is not fabricated.

## Verification

- 32 data/domain tests passed, including accounting, source data, grouping, route camera and new Passport math.
- Reference/travel/Earth regression: 10 passed initially; remaining 2 passed after updating the account count expectation to three and waiting for the calibrated phone layout before dispatching touch input. Touch drag/pinch, iPhone and Pixel gestures, reference Add Flight/Friends, grouping, notes and year filters verified.
- New Passport flow script passed: three accounts, pinning, all-time cover, year selection, chart modes, rankings, Chicago summary, Japan review/save and trip Passport. No page errors.
- Final visual script passed; all 28 protected runtime files verified; TypeScript/Vite build and 4 Sites Worker tests passed.
- Follow-up P3: physical-device/assistive-technology validation and higher-resolution Earth tiles for very close zoom. Dataset size, geographic projection, decorative serial treatment and omitted unknown statistics are intentional differences, not source substitution.

User-facing review: `qa/passport-refresh/report.md`.
