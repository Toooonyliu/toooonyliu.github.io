# Portfolio integration QA — September 15, 2026

Visual target: the existing live toooonyliu.github.io homepage. Compared its 1440 × 1000 capture side by side with the new case-study hero at the same viewport. White/black tokens, Space Grotesk, pixel labels, dotted grid, header spacing, section rules, and outlined actions match. The app imagery intentionally retains its existing dark visual language.

Verified locally:
- Homepage project link, case-study navigation, section anchors, full-screen demo links, and on-demand embedded demo.
- Layout at 375, 768, 1024, and 1440 pixels; no horizontal overflow.
- All four prototype images loaded and inspected; lazy images checked after scrolling into view.
- Standalone demo textures, phone assets, fonts, and scripts resolve under the GitHub Pages subpath.
- Passport interaction and data (72,674 km) on the production build; mobile touch navigation.
- Browser check found zero page errors and zero failed HTTP responses.
- `npm run build:pages` succeeds; all 28 protected mobile-runtime files pass integrity checks.
- Keyboard focus indicators, skip link, image alternatives, and iframe title included.

No unresolved P0/P1/P2 issues in the added portfolio flow. Existing prototype limitation: the 3D application bundle is large; it loads only on explicit demo interaction, so it does not slow the case-study landing page. Customer usability and assistive-technology studies remain future work; no measured customer outcomes are claimed.
