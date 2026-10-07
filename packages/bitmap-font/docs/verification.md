# Local verification — 2026-10-07

- Headless build and strict ES2022-only typecheck. The public package imports in
  Node without DOM or game-engine dependencies.
- Parser/serializer/layout tests cover the real number-font descriptor, BMFont
  text with Unicode supplementary characters and kerning, immutable snapshots,
  malformed input, round trips, code-point wrapping, hard breaks, complete-line
  height clipping, negative bearings, zero advances, alignment and long input.
- Core tests cover glyph geometry in GPU/Canvas, WebGL leaf dispatch, independent
  measurement, layout invalidation, font/page ownership, default resource loading,
  relative page URLs, concurrency, failed loading and retries.
- UI tests cover constraints, spacing, binding notifications, cached/async font
  names, stale requests, clearing and loading errors.
- Browser validation uses the original number_font.fnt/png from the game, loaded
  by FontAnalyzer. WebGL 2, WebGL 1 and Canvas render normal numbers, tinted
  multiline text, a scaled BitmapLabel, a clipped number field and synthetic
  negative-bearing/zero-advance glyphs. Players are created/destroyed sequentially.
- Stable frames use the engine's existing two-render golden-test convention.
  Opaque synthetic samples match exactly; the original unscaled numeric row has
  no composited pixel differences above 3 levels per color channel between GPU/Canvas.
  Translucent/tinted/scaled edges are not claimed to be pixel-identical.
- Clearing text removes its pixels, then changing text and position renders the
  new value through the existing instruction. RenderTexture captures the real
  glyph color, and destroying the font leaves a standalone PNG resource alive.
- A packed tarball installs in a fresh Node consumer; a strict NodeNext/ES2022
  consumer typechecks, imports the package and checks layout/serialization.

Font editing UI, multi-page/channel-packed/binary/XML BMFont, CLI KUI adoption,
Editor materialization, and npm publication are outside this initial change.
