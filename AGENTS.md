# Mobile Prototype Agent Guide

## REDcowork handoff scope (2026-10-18)

- This independent copy follows the original website demo, not the earlier `redcowork-mibly` experiment. Keep map-first everyday food sharing and the five existing navigation destinations.
- Add only the focused `找那一餐 / Find that meal` flow. Keep everyday screens quiet: the brand name is sufficient, and assessment explanations belong in `docs/`, not permanent banners over the map.
- Keep sharing in one compact composer, without a staged AI correction example or generated feelings. A photo OR food name is sufficient; optional feeling defaults to unrated and must not become a positive recommendation. Preserve the original meal photos and declared-location boundaries.
- REDcowork WEB_APP: the model runs on the server only. `server/llm.ts` is the single place that calls `guard_sdk/ai`; `server/recall-service.ts` authorizes records from the server copy, applies hard rules, calls the model once and verifies every ID/quote. The browser (`src/recall/adapter.ts`) holds no key or prompt. Keep the AI status label and the explicit, user-chosen keyword fallback labeled "未使用 AI".
- Search defaults to confirmed friends. The user can explicitly choose their own records or both. Exclude hidden, private-to-other-people, pending-friend and friends-of-friends records before constructing a model request. Production authorization belongs on the server too.
- State uses the independent key `mibly-redcowork-v2`, with original IDs preserved; do not overwrite another prototype's local data. Default language is Chinese, with the original English switch retained.
- Read `docs/AI-INTEGRATION.txt` before connecting any model. Validate evidence against supplied record IDs and original text, and retain unknown, no-result, error, retry and cancellation behavior.
- Before handoff run `npm test`, `npm run check:runtime`, and `npm run build`. Browser verification is separate; state it as blocked when no browser can be connected.

## Prototype Instructions

In REDcowork, preview the app through the platform's own preview (WEB_APP: build the frontend with `npm run build`, serve it with the Express server in `server/index.ts` or the template's server). Do not use the Sites worker in `worker/`; it is a leftover of the original template.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, compare with `references/original-*.png` and https://toooonyliu.github.io/projects/mibly/ when the visual source is unclear. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- In this independent REDcowork copy, `npm run build` preserves the mobile runtime and creates static output at `dist/client`. The retained worker and Sites scripts are legacy template materials, not required for this frontend handoff. Do not enable a Sites deploy or replace this project with a Vinext starter.

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


## Mibly accepted product decisions

- The current working product name is Mibly. This independent copy uses `mibly-redcowork-v2` and preserves existing meal IDs; leave the original demo's `food-reals-v3` data untouched.
- Use designer-supplied meal photos from `public/assets/meals/`; keep original files in `../Photo References` unchanged. Synthetic authors and dated meal histories are demo scenarios, not identities inferred from photos. Do not attach an unconfirmed restaurant address to Korean BBQ or the rice dish. The map and avatar assets remain illustrative.
- Two HTML presentations live in `public/slides/product.html` and `public/slides/process.html`, with a click-to-start elapsed timer, notes, keyboard navigation and an embedded interactive runtime. `?presentation=1` uses temporary state and accepts only same-origin parent scene commands; never write rehearsals into the main app's local storage.
- Live-demo slides place feature labels on the left and the interactive phone on the right. Selection follows actual phone state in both directions, including sheets and native navigation. Validate state messages by origin, frame source and load session; reset clears temporary frames, not main-app data.
- Process slides show genuine historical screenshots and enlarged component comparisons. Keep source captures unchanged and record provenance in `public/slides/assets/iterations/manifest.json`; preserve the distinction between real designer photos and synthetic demo identities/history.

- Iteration 5 retains the iteration 4 map-first visual direction and the user's BeReal references for social navigation, photo-led posts, Chat, Memories, and Profile. Use `public/assets/food/pittsburgh-world.png` for the illustrated map terrain; do not copy BeReal branding or imply genuine dual-camera capture.
- Home opens on the full-screen illustrated food map, with Feed as a secondary toggle. Each meal pin combines a food photo, friend avatar, posted time, and declared place. Support drag/pinch/wheel/button zoom, recentering, Today/Yesterday, and pin → preview → meal detail.
- Five bottom-nav actions: Home, Chat, central Capture, Memories, Profile. Restaurant picking and saved places remain accessible from Profile, not primary destinations.
- Chat's only global entry is bottom navigation. Home's top-right action opens the people center: search, discover, incoming/outgoing requests, and confirmed friends. Requests remain pending until accepted; demo actions persist locally and never contact real people.
- Home's people scope controls both Map and Feed: My friends by default, Friends of friends as an explicit choice. Apply `socialGraph.ts` visibility rules to discovery and restaurant history: second-degree posts require a mutual friend, per-post opt-in, and a known restaurant. Home, delivery, and private posts stay excluded; sending a request does not grant friend access.
- Feed supports date filters, a person's visible history, and loading more records. Hidden people can be restored from the people center. Preserve existing local data when adding social state.
- Restaurant cards offer Google Maps, directions, share, copy, and address export. Direct restaurant sharing contains only venue name, address, and a Google Maps URL. A canceled native share performs no fallback action; unavailable clipboard access reveals selectable text. Keep list sharing a separate secondary action.
- Dark charcoal/sage social screens, quiet photo-led cards, and a prominent central capture action. Memories has fixed Moments/Calendar/Recaps tabs; Profile has a photo hero and today's meals. Keep the food map visually distinctive rather than reproducing BeReal's feed as Home.
- Publishing requires a photo or food name. Feeling, type, place and note are optional; expose audience clearly. An omitted feeling is unrated, not an implicit endorsement.
- Four verbal levels; no displayed numeric restaurant score or forced pairwise ranking.
- Restaurant map shows shared past visits, never live location. Homemade/delivery/private meals never imply a public restaurant visit.
- Friends Map must work without a Maps key. Terrain and pin coordinates are illustrative, not navigation-grade geography. Locations are post-declared context, never current/live tracking; home markers stay approximate and never expose an address. Missing locations get no spatial pin, and delivery alone must never imply home. Restaurant directions may still open Google Maps.
- Private meals appear in the author's Memories/Profile only, not Home/Chat. Public posts return to Home with their preview selected; private posts return to Memories. Preserve existing browser data across updates.
- Chat consists of local meal-attached replies. Reactions persist locally. Recaps are a manual meal slideshow, not generated video. Do not imply live conversations, delivery receipts, or a backend.
- Local persistence and public static list snapshots; no real messages, accounts or server-backed shared conversations.
- Separate author verdict from a recommendation deliberately sent by the current user.
- English and Chinese UI; Pittsburgh venues from source-linked research. Settings distinguishes designer-supplied post photos from synthetic personas/history, illustrated terrain and older restaurant-catalog imagery.
