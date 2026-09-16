# Mileage planner and Trip Passport QA

Date: September 15, 2026

## Visual truth and comparison

Source visual truth: existing approved demo captures at `../research/flighty/demo-feedback-review/01-home.png`, `02-accounts.png`, `03-trip-passport.png`, supplemented by the user's approved functional changes in the same review. This is a revision of the existing charcoal/purple app, not a pixel-identical reproduction of the former account card or annual chart.

Rendered evidence: `qa/planner-journey/01-home.png` through `12-home-expanded.png`. Browser viewport 1400 × 1200, deviceScaleFactor 1. iPhone captures are 393 × 852 pixels/CSS px at scale 1; Pixel captures are 427 × 952. Baseline iPhone captures are also 393 × 852; no density resizing is required.

Combined comparison inputs opened and reviewed: `qa/planner-journey/compare-home.png` and `compare-journey.png`. The home comparison explicitly uses the old resting panel and the new expanded panel to expose the full revised account section; panel proportions are intentionally different states, not a claimed visual mismatch. The trip comparison uses the same Chicago statistics state, replacing the annual chart with the approved chronology.

Focused evidence: `03-search.png`, `04-results.png`, `05-benefits.png`, `06-projection.png`, `07-empty.png`, `09-cross-year.png` and `11-pixel-planner.png` were inspected at full phone resolution to check dense labels, counters, safe areas and error/empty states.

## Findings and iteration history

- Resolved P2: the initial search form put its primary action too close to the lower safe area. Reduced introduction, notice and field spacing. Post-fix `03-search.png` shows the full Compare flights action above the home indicator.
- Resolved P2: repeated price explanation and oversized result spacing hid alternative options. Removed duplicate first-option explanation and compacted credit rows/filters; `04-results.png` and `11-pixel-planner.png` show comparable options with readable price, route, stops and credit information.
- Resolved P2: the existing panel handle's pointer tap did not expand it reliably, even though keyboard activation worked. Pointer-up now handles taps explicitly; click handles keyboard activation. The final browser run verifies tap expand/collapse and keyboard expansion. `12-home-expanded.png` shows all three account rows below the destination entry.
- No remaining actionable P0/P1/P2 findings in the reviewed flows.

## Required fidelity surfaces

- Typography: existing system family, native phone chrome and clear title/body/metadata hierarchy retained. Search inputs, prices, local clocks and goal counters wrap without truncating essential data.
- Spacing/layout: original navigation and next-flight priority retained. Planner is a separate full screen, with existing phone-scoped sheets; the account overview is compact and full detail remains one tap away. iPhone/Pixel lower chrome stays usable.
- Colors/tokens: charcoal surfaces, purple goal/Passport accents and blue existing navigation actions retained. Sample labels, counter names and selection text supplement color.
- Image/assets: original airline logos, real NASA globe and existing trip thumbnails retained. No generated geography or replacement logo approximations added.
- Copy/content: fictional prices and scenario credit labeled; qualification counters separate from spendable miles; current perks distinct from future activation. Manual/expired/unknown status does not guarantee benefits. Timeline says departure/arrival or recorded gate time, not invented takeoff/landing events.

## Functional verification

- `npm run build`: passed; all 28 protected runtime files match their lock. Existing large-bundle warning remains.
- `node --test tests/*.test.mjs`: 42 passed. Includes rankings, both ANA counters, selected program, cabin, goal deadlines, unsupported queries, unknown/expired tiers, cross-year dates, time zones, missing data, canceled flights and surface transfers.
- `scripts/planner-journey-qa.mjs`: passed with zero page errors. Covers homepage rows/account detail, form, cost vs goal ordering, program switching, Business lounge scenario, nonstop empty state, invalid return date, unchanged persisted balances, trip leg drill-down, cross-year recap and preservation of all-time charts. iPhone and Pixel previews captured.
- Public export browser smoke check passed with zero page errors and zero HTTP failures; compact-account details, panel tap/keyboard activation, Tokyo goal ranking and both counters were verified. Public export scopes assets to the GitHub Pages subdirectory. The separate Sites deployment is not updated by this revision.

## Remaining validation limits

Fares, inventory, earning packages and modeled benefits are curated examples. No live booking or loyalty integration. Dates do not drive live fares; exact fare-class/segment rules and full status eligibility need a production data service. Frequent-flyer usability testing, complete VoiceOver/TalkBack testing and physical-device GPU checks remain future work.

## Implementation checklist

- [x] Compact accounts plus preserved detailed cards
- [x] Destination/date/cabin comparison with transparent priorities
- [x] Benefits now versus future goal progress
- [x] Trip chronology and original-flight drill-down
- [x] Protected runtime, calculations, phone browser interactions and visual comparison
- [x] PRD scope addendum records exploratory planner scope

final result: passed

## September 16 calculated-earnings follow-up

- Replaced fixed earning packages with published base earning formulas and disclosed sample inputs. Sources and coverage are in `public/assets/EARNING_RULES.md`.
- Added purple/current + yellow/proposed bars with numeric labels, visible targets, separate ANA Group requirements, concrete JAL→BA earnings and official booking handoffs.
- `13-jal-calculation.png`, `14-yellow-progress.png` and refreshed `06-projection.png` were visually inspected at native iPhone resolution. No clipped labels or obscured booking controls were found. Existing charcoal/purple identity remains, with yellow used solely for proposed progress.
- Extended browser regression passed with zero page errors, including JAL formula/source expansion, yellow color and official URL, initial All-Time and reset after selecting 2023 and navigating away/back. Existing Trip and Pixel flows passed.
- Unit arithmetic found and fixed a floating-point floor bug (5,130 × 70% must be 3,591, not 3,590); calculations now multiply integer percentages before dividing.
- Limitation: these are base earnings under visible assumptions, not complete personalized posted totals. Fares remain fictional; bonuses, final booking class and fare components require airline confirmation.

Final September 16 checks: production build and 28-file runtime integrity passed; 47 unit tests passed; exported GitHub Pages browser smoke passed with zero page errors and zero HTTP failures.
