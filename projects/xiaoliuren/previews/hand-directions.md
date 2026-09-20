# Hand-drawn studies — A / B

These are independent HTML previews. Neither replaces the live consultation page.

- `palm-structure.html`: a restrained geometric contour, open hand, Noto Sans SC display/interface typography.
- `palm-flow.html`: a tapered wrist, curved fingers, a resting thumb/index gesture and Noto Serif SC display typography; Cormorant Garamond for English headings.

Both use original SVG paths authored for these studies, not the watermarked reference bitmap. The illustrated direction follows the requested screen orientation: thumb at screen-left, little finger at screen-right, 大安 at the lower-left counting position. Anatomically, a left palm facing the viewer normally places its thumb at screen-right; these previews are intentionally described as mirrored counting diagrams rather than anatomical left-hand images.

The thumb and finger contours animate together. The selected finger bends toward the thumb at the three upper positions. Node labels follow their moving coordinates. A fixed example (Chinese lunisolar month 3, day 3, Chén hour) ends at 速喜 using inclusive counting. The Gregorian correspondence, 2026-04-19, was checked against Hong Kong Observatory's API. These previews do not calculate a real reading, call a runtime calendar service, record questions, or offer microphone input. Their purpose is to compare hand shape, composition, and typography.

## Layout recommendation

The current interface has many always-visible explanatory layers: speech help, section kickers, time controls, timing caveats, source context and secondary actions. Give the desktop's left 60% to the hand with no containing card or decorative frame. Limit the right side to two time lines, a question heading, input and one action. Keep the requested consultation reminder as one quiet paragraph. Reveal month/day/hour labels only during counting. Keep complete sign labels behind a toggle. Put usage help, storage details, timing explanations, sources and history navigation in an intentional menu or contextual disclosure. On narrow screens, retain time/question first and put the hand below rather than shrinking both into two columns.

For result mode, the hierarchy is sign → classical verse → modern reflection. English retains both the Chinese verse and its translation. Do not give every field a separate eyebrow label or box.

## Type recommendation

Prefer the B pairing for the intended calm, artistic direction: Noto Serif SC / Source Han Serif for Chinese display text and verse; Noto Sans SC / Source Han Sans for controls and practical text. Use Cormorant Garamond only for larger English display type. Avoid light calligraphic fonts for the full body. Suggested scale: desktop question 40–52px, result 72–80px, primary text 18–20px, interface 14–16px, secondary note 13px. Use whitespace and limited weights, rather than making every label small or widely letter-spaced.

Official sources:
- https://github.com/adobe-fonts/source-han-serif
- https://github.com/adobe-fonts/source-han-sans
- https://github.com/CatharsisFonts/Cormorant
- https://6ren.chaosxy.com/results/ (classical verse)

Validation: syntax and actual-script DOM checks for both previews; six poses, inclusive example, language switch, escaped user text, result replacement, replay/reset and label toggle. Resting and pinching SVG states were rendered with a native canvas renderer and visually inspected. Browser layout and real-device testing were not available in this session.
