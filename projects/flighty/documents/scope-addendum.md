# Flighty Travel Profile — prototype scope addendum

Date: September 15, 2026  
Owner: Tony Liu  
Companion document: [PRD v1.0](Flighty_Travel_Profile_PRD_v1.0.pdf), proposed September 10, 2026. The original 29-page PDF is preserved unchanged.

## Purpose

Document the current concept's scope changes. This addendum records prototype decisions, not approval to ship production services.

## Core: Trips

The core opportunity remains retrieving and reusing a complete journey from individual flight records. The prototype preserves My Flights, Friends and Passport. The original local Overview/Trips switch has evolved into Flights/Trips beneath Passport's Past Flights.

Reviewed grouping, add/remove, split/merge with Undo, notes and original-flight drill-down remain central. New destination thumbnails, a globe camera fitted to the trip route and a trip Passport elaborate this core.

Acceptance boundaries: suggestions remain unsaved until reviewed; original flights remain available; surface transfers must not become inferred flights; summary values derive from group membership; missing data stays visible.

## Separate pilot: Mileage & status

PRD v1.0 scoped a manual loyalty snapshot and personal review reminder. It deferred automated balances, qualification calculations, status forecasts and pre-booking recommendations.

The later prototype explores multiple accounts, reach/retain/save goals, independent qualification counters, manual posted credit and separate pending/booked estimates. These elaborations exceed the initial pilot. They are presented as exploratory, not validated MVP requirements. No account connection or live qualification guarantee is implemented.

Acceptance boundaries: geographic distance is separate from loyalty credit; posted credit is not added twice; unknown is not zero; program rules, personal targets, source and update date are identifiable. United and British Airways example targets are illustrative personal goals, not elite-status thresholds or award prices.

## September 15 follow-up: choosing a flight and recalling a journey

The approved demo now includes a compact mileage account overview and a destination/date/cabin planner. It compares a curated set of fictional cash fares by cost, progress toward a selected goal, or modeled benefits. Expanded options distinguish usable fare/sample-tier benefits, redeemable earnings, required qualification counters and potential benefits after airline activation. The account model adds optional explicit tier and validity dates. Exploring does not alter balances, confirmed flights or booked projections.

This remains a separate experiment beyond v1.0. PIT/SFO → Tokyo, London and Chicago scenarios are not live search; dates constrain goal/tier eligibility, not inventory or prices. The initial September 15 version used illustrative earning packages; the September 16 revision below supersedes those packages. No booking, award inventory, automatic account sync or universal benefits catalog is implemented.

Trip Passport replaces its per-year frequency graph with first departure, final arrival and chronological legs in airport-local dates/time zones. All-time/year graphs remain. Cross-year trips, canceled records, missing timestamps and unrecorded surface transfers are handled explicitly.

Additional validation questions: can travelers explain why the cheapest option differs from the strongest goal option; identify benefits usable now versus after qualification; and understand that projected credit has not been earned?

## Evidence and validation

The original PRD used 12 purposively selected qualitative accounts: nine Reddit, one Flighty App Store and two AwardWallet Google Play. This is desk research, not an interview sample. The website adds context from four selected historical App Store reviews; the trip-grouping review overlaps the original set and is not a new independent participant.

Validate Trips through retrieval success/time and group correction effort. Validate loyalty separately through earned-versus-estimated comprehension, manual upkeep effort and repeated opt-in use. Any retention hypothesis needs a controlled rollout and travel-day usability guardrails. No commercial lift is measured or claimed.

## Before production

Recheck the current competitive feature set; conduct direct research with multi-airline frequent flyers; validate data availability, privacy, support cost and eligibility edge cases. Keep operational flight tracking prominent. Use a revised PRD version if the loyalty pilot earns a larger scope.

## September 16: calculated base earnings and booking handoff

The planner now calculates base miles/Avios and qualification counters from published rules under explicit sample booking-class, ticket issuer, tax and exchange-rate assumptions. Per-segment formulas and source links are visible in the option details. Tier/card bonuses remain excluded; approximate sector mileage is identified. See [calculation coverage and sources](../demo/assets/EARNING_RULES.md).

Purple progress represents the entered balance and yellow represents the proposed trip. JAL options expose eligible BA Avios credit when ANA is the selected comparison goal, without suggesting ANA progress. Official airline links let travelers search and book independently; no fare or availability is reserved. Passport navigation now opens All-Time.

Production still requires ticket-level booking classes, validated sector miles, fare components, membership bonuses, return-leg allocations and current rules. This remains an exploratory planner, not a guaranteed credit or booking service.

## September 16: membership value and journey hierarchy

Approved by Tony after the UX/product review. Mileage now introduces frequent-route shortcuts and a locally remembered last search. Compact rows show attained-tier badges, current-benefit previews and remaining goals. Full cards separate current membership benefits, conditions, next-tier previews and explicit account editing. Badges reflect the entered tier and validity, never a projected threshold crossing.

A bounded official-policy catalog covers ANA Bronze/Platinum, United Premier Silver/Gold and BA Bronze/Silver, including the BA-on-JAL partner scenario. Recognized manual entries and demo accounts follow the same eligibility checks. Operating airline, membership dates, benefit timing and paid lounge conditions matter. Fare inclusions remain scenario assumptions; this is not a universal live benefit engine. See [benefit policies and sources](../demo/assets/BENEFIT_POLICIES.md).

Benefit sorting now prioritizes itinerary coverage by current-tier benefits, then price; it does not equate a count of perks to a cash value. Purple current progress and yellow proposed growth remain separate. Official booking links hand off to the airline without reserving anything.

Trips promotes first departure, final arrival and expandable flight legs to the overview, before optional Passport statistics. List routes include the origin and cross-year dates show both years. Original records, surface gaps, review controls and editing remain available.

The next research step is a moderated pilot with 8–10 multi-airline frequent flyers: compare decision time and benefit/credit comprehension for Mileage, and retrieval time, final-arrival comprehension and grouping correction effort for Trips. Monitor upcoming-flight access as a guardrail. Longer-term repeat use and retention require a suitable baseline or controlled rollout; no commercial impact has yet been measured.
