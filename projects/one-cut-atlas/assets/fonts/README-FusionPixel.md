# Fusion Pixel Chinese UI font

`fusion-pixel-12px-proportional-zh_hans.woff2` is the unmodified Simplified
Chinese variant of **Fusion Pixel Font / 缝合像素字体**, by TakWolf and its
upstream contributors. Only the filename has been shortened from
`fusion-pixel-12px-proportional-zh_hans.otf.woff2`.

- Upstream: https://github.com/TakWolf/fusion-pixel-font
- Pinned release: https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.09.01
- Source archive: https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.09.01/fusion-pixel-font-12px-proportional-otf.woff2-v2026.09.01.zip
- Format: WOFF2, proportional spacing, 12-pixel design, zh-Hans glyph forms.
- Size: 661,212 bytes (about 646 KiB).
- SHA-256: `de421b3da7b20e045f0712ee838f30c225f4610b348efb37e2b31baa98860cbf`.
- License: SIL Open Font License 1.1. The release's complete license notices
  are preserved under [`fusion-pixel-licenses/`](fusion-pixel-licenses/):
  the Fusion Pixel notice and the Ark Pixel, Cubic 11, and Galmuri notices.

The complete upstream zh-Hans font is vendored, not a game-text-only subset.
This allows new Chinese UI strings to use the same pixel style without a
font rebuild. The font is self-hosted: no external font CDN is required.
Upstream coverage is extensive but does not include every Unicode character;
keep a system CJK font fallback.

The upstream project recommends proportional spacing for ordinary text.
For crisp pixel edges, prefer the native 12px size or integer multiples
such as 24px. A CSS `@font-face` alias such as `"Fusion Pixel"` can be used
without changing the font binary.
