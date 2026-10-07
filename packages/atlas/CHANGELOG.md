# Changelog

## 0.1.0 — 2026-10-07

Initial local implementation; not published.

- Add independent portable RGBA atlas packing with deterministic nonrotated
  MaxRects placement and single-sheet power-of-two size selection.
- Add alpha cropping, retained trim margins, straight-alpha composition,
  transparent RGB clearing and edge/corner extrusion.
- Emit flat Kurot-compatible file/frames JSON with trim offsets and logical size.
- Add a separate Node PNG entry point using pngjs; bound decoded pixel counts,
  validate PNG input and reject APNG.
- Add synthetic pixel, packing, deterministic-output and PNG regression tests.
- Add repeatable read-only local basis/basis_icon validation for frame schemas,
  RGBA pixels, cropping, extrusion, overlap and deterministic output; record
  existing CLI development/release compatibility and future integration proposals.

No Core, CLI, Editor, Reskin or game project behavior changes. Filesystem writes,
skin edits, manifest updates, rotation, deduplication and multipack are outside
this release.
