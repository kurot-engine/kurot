# Changelog

## [0.1.0] — 2026-10-08

- Add a versioned single-page font model, strict frozen snapshots and
  deterministic native JSON serialization.
- Import Egret frames JSON and full-color BMFont text, preserving bearings,
  advances, logical sizes, baseline and kerning.
- Share Unicode code-point layout, line wrapping, alignment, source indices and
  painted bounds between Core and future editor consumers.
- Keep the package independent of Core, UI, Atlas, browsers and image decoding.
- Initial release with named ESM exports, TypeScript declarations and no runtime
  dependencies. Test fixtures and game assets are excluded from distribution.
