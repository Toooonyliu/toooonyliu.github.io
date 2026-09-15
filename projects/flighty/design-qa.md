# Flighty case-study redesign QA

Date: September 15, 2026

## Target and scope

Selected visual truth: the user's Flighty website screenshots and https://flighty.com/. The approved content direction replaces the broad existing-feature/pricing story with Trips and Mileage & status, preceded by Why Flighty, competitive evidence and a How might we statement. This is a visual-language adaptation, not a pixel-identical clone of the original content.

Source captures:
- `/tmp/flighty-portfolio-qa/reference-hero.png`
- `/tmp/flighty-portfolio-qa/reference-aircraft.png`

Source and primary implementation captures are 1440 × 1000 CSS/pixel dimensions, device scale factor 1. Side-by-side boards scale both equally to 720 pixels wide. The original aircraft section and new Why Flighty section have intentionally different content and card proportions; the comparison evaluates aircraft integration, dark surfaces, type hierarchy and section rhythm.

## Comparison evidence

- `/tmp/flighty-portfolio-qa/redesign/hero-comparison.png`
- `/tmp/flighty-portfolio-qa/redesign/aircraft-comparison.png`
- Focused implementation views: `final-trip-detail.png`, `final-trip-chart.png`, `final-evidence-detail.png`, `final-reviews.png`, `final-opportunity.png`, `final-mileage-chart.png` in the same directory.
- Mobile: `final-mobile-hero.png`, `final-mobile-loyalty.png`, plus responsive captures at 320, 375, 390, 650, 768, 1024, 1440 and 2010 CSS pixels.

## Findings and iteration history

1. P2 — Trips phone stretched vertically. The HTML height attribute persisted after CSS changed width. Set the image to `height:auto`. The final trip-detail capture preserves the screenshot ratio and shows the entire summary at desktop size.
2. P2 — Hero selector could sit below the viewport. Made the source-inspired selector fixed while the hero intersects the viewport; it disappears outside the hero. Verified visible at phone and desktop sizes and keyboard-operable.
3. P2 — Dense heading tracking and tiny review cards on phones. Reduced heading weight/tracking, gave the mobile title three deliberate lines, and changed narrow review layouts to one column with readable body text.
4. P1 — Secondary text below WCAG AA contrast in research and feature cards. Darkened the secondary palette; automated axe-core 4.10.3 WCAG A/AA checks then returned zero violations at 1440 and 390 pixels.
5. P2 — Navigation did not adapt to dark sections. Added a dark pill/white CTA treatment and a compact mobile menu. Verified menu opening, Escape dismissal and section links.

## Required fidelity surfaces

- **Fonts:** native system sans-serif matches the source font choice. Oversized headings, restrained body hierarchy and wider tracking after correction. No external font dependency.
- **Spacing/layout:** centered phone, surrounding benefit cards, rounded floating navigation, generous section gutters and rounded product cards. Responsive cards stack without horizontal page overflow.
- **Colors/tokens:** white/pale-lilac research and product sections, near-black aircraft/mileage sections, purple HMW/history identity, yellow selected hero state. Increased secondary contrast while retaining the reference tone.
- **Assets:** actual prototype screen captures, existing destination thumbnails, Phosphor icons and attributed source aircraft/star imagery. No generated map geography. Aircraft uses a captured raster with lightweight motion rather than the source 3D component. Image aspect ratios checked visually.
- **Copy/content:** two additions stay central. Published services, historical review evidence, original PRD scope and new hypotheses are distinguished. Numbers in interactive feature charts match the prototype fixtures. The original PRD PDF hashes match byte-for-byte.

## Functional verification

- Hero tabs: selected states, matching phone/cards, detail links, ArrowLeft/ArrowRight/Home/End support.
- Competitive comparison: travel day, travel history and loyalty panels.
- Trip chart: four original records, distance/time switching, accessible data table. No surface transfer inserted as a flight.
- Loyalty chart: ANA, United, BA; ANA earned-only 8,000 remaining vs 7,150 after the separate 850 booked estimate; United 1,800 PQP remaining and 16/20 PQF; BA 12,000 Avios remaining with tier points separate.
- Aircraft: pause/resume, offscreen pause, reduced-motion suppression.
- PRD link: HTTP 200, PDF MIME type, unchanged SHA-256. Scope/research disclosures expand.
- Embedded demo: no iframe before activation; My Flights loads and Passport navigation works. Existing app source and production build unchanged.
- No broken local anchors, images, page exceptions or HTTP failures in the local walkthrough.
- Responsive widths: 320–2010 pixels; zero horizontal page overflow.
- Mobile navigation and keyboard focus checked.

## Limitations / follow-up

- Automated accessibility checks supplement the visual and keyboard review; they are not a complete assistive-technology certification.
- Chromium and simulated mobile viewports were checked. Native Safari/VoiceOver device testing remains a useful follow-up.
- This is a working design prototype with sample/manual data, not validated customer outcomes.
- The hero and feature screenshots are explanatory previews. Full app interaction is in the on-demand demo.

final result: passed
