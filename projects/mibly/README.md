# Mibly — Your people. Their plates.

Product-design portfolio case study by Tony Liu. This local addition adapts the Mibly product and AI-process presentations into one continuous case study, following the visual pacing and evidence-led structure of the existing Flighty page.

## Status and scope

Prepared for publication at `/projects/mibly/`. The existing Flighty page is unchanged. The portfolio homepage has one additional Selected Work card, and the AI process reflection lives on its own page at `/projects/mibly/ai-process.html`.

## Page structure

Visual introduction → opportunity and competitive position → Discover → Define → Develop → privacy boundaries → Deliver → planned evaluation. A concise gateway links to the separate AI process reflection.

The case study uses original screenshots and designer-supplied meal photos. The research sample, synthetic interviews, demo identities, and untested product hypothesis remain explicitly distinguished. No participant outcomes, adoption, or retention improvements are claimed.

## Files

- `index.html`, `case-study.css`, `case-study.js`: static product case study, no framework or build step.
- `ai-process.html`, `ai-process.js`: separate reflection on what AI was used for, where it helped, and where it did not.
- `images/`: unmodified prototype screenshots. Component crops are CSS viewports; provenance is in `images/credits.json`.
- `evidence/`: original sampling method and coded theme counts from the project.
- `demo/`: generated GitHub Pages-compatible app, assets, and the two HTML slide decks.
- `source/`: maintainable app source. Runtime-protection rules live in its `AGENTS.md`.
- `export-demo.mjs`: reproducible export from `source/dist/client`; rewrites only root-relative asset references for the project subpath.

Serve the repository root to preview `/projects/mibly/`. The active review preview uses port 4180. Opening the HTML with `file://` does not support the embedded app.

## Interaction contract

The hero switches among Map, Feed, and Memories screenshots. Iteration buttons switch between actual before/after evidence. Research details expand on demand.

The live phone loads only when the reader clicks Launch, chooses a feature, or follows a feature walkthrough link. Labels on the left and the phone on the right synchronize in both directions. Reports are validated by origin, iframe source, protocol version, and a per-load session token. Closing or reloading the iframe clears only temporary presentation state; the main app's saved data is untouched. An unavailable phone leaves the case study and screenshot previews usable.

All eight categories are accessible with standard keyboard buttons. Mobile navigation has an explicit menu control and Escape dismissal. Reduced-motion preferences disable smooth scrolling. Without JavaScript, the narrative and historical comparisons remain available, with a direct prototype link.

## Rebuilding the embedded app

From `source`, install the pinned dependencies with `npm ci` and run `npm run build`. Then, from this directory, run `node export-demo.mjs`. Commit source and generated demo together only after publishing is approved. No changes to the protected phone runtime are required for this export.

The presentations remain available at `demo/slides/product.html` and `demo/slides/process.html`; their timers, notes, and two-way phone demos are preserved.
