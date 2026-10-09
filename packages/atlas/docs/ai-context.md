# @kurot/atlas — AI context map

Version 0.1.0, published to npm. Independent build-time
atlas library; no Kurot package dependencies. Private tools/default-ui-assets
consumes registry 0.1.0 to generate the committed KUI default atlas. No published
SDK or browser runtime gains an atlas dependency.
Read README.md for input limits and the pixel/output contract.

## Directory map

```text
src/
  index.ts          Portable public entry point, no Node or PNG imports
  AtlasTypes.ts     Pixels, stable source names, options and flat sheet types
  AtlasError.ts     Error categories
  options.ts        Bounds and pixel/source validation
  trim.ts           Alpha crop, retained margins, transparent placeholder
  max-rects.ts      Nonrotated placement, split/prune free rectangles
  layout.ts         POT candidate search and deterministic sorting
  render.ts         RGBA blit, edge/corner extrusion, frame serialization
  pack-atlas.ts     Pure pack pipeline
  png/index.ts      Node-only static PNG decode/encode and batch adapter
test/
  helpers.ts        Synthetic RGBA sources and pixel access
  pack-atlas.test.ts Pixel geometry, packing invariants, validation
  png.test.ts       Codec roundtrip, PNG contract and input limits
scripts/
  verify-reference.ts Read-only local sample validation with output/report in a new directory
  reference-checks.ts Independent crop, pixel, extrusion and overlap checks
```

## Public API

- `packAtlas(sources, options?)`: in-memory RGBA to AtlasResult (image and data).
- `AtlasError`, `AtlasErrorCode`: categorized failures.
- `AtlasImage`, `AtlasSource`, `AtlasOptions`, `AtlasFrame`, `AtlasData`, `AtlasResult`.
- Subpath `@kurot/atlas/png`: `decodePNG`, `encodePNG`, `packPNGAtlas`,
  `PNGAtlasSource`, `PNGAtlasResult`. All synchronous, Node.js >=20; no I/O.

## Non-obvious invariants

- Name is the exact authored resource key, not a guessed filename. Duplicate names
  reject, duplicate pixels do not alias. Object member names are safe frame keys.
- Input buffers remain unchanged. Output zero-alpha RGB is zero; alpha is straight.
- Extrusion is outside frames; offX/offY locate trimmed pixels in the source canvas.
  SourceW/sourceH are logical dimensions, not packing bounds.
- Fully transparent cropped images emit one clear pixel plus original logical size.
- Trimming is per source; no automatic nine-slice detection. Callers may disable
  trimming for a batch. No default-resource metadata is authored here.
- Candidate sizes are powers of two and can be rectangular. Packing is heuristic;
  output is deterministic but not identical to TexturePacker.
- Shape padding reserves right/bottom space even for an outermost item; extrusion
  is already included separately. Border padding is outside all placements.
- Default settings match the observed sample's trim threshold/margin/extrusion and
  POT single-sheet profile. This is not a generic `.tps` compatibility promise.
- Errors and results never change files. Atomic project replacement, manifest
  preservation, cache invalidation and worker scheduling belong to the caller.
- PNG metadata/colorspace are not propagated or gamma-corrected; output is RGBA8.
- Public root exports must stay free of Node/pngjs imports. No runtime library may
  gain an atlas dependency just to load prebuilt sheets.

## Task routing

| Task | Files |
| --- | --- |
| Input/output contracts | AtlasTypes.ts, options.ts, README.md |
| Crop/empty-source behavior | trim.ts, render.ts, pixel tests |
| Packing density/determinism | max-rects.ts, layout.ts, packing tests |
| Extrusion/transparent RGB | render.ts, pixel tests |
| PNG safety/encoding | png/index.ts, png.test.ts |
| Reskin/Editor persistence | Consumer service; outside this package |
| Sample compatibility and repeatable verification | docs/reference-validation.md, scripts/ |
| CLI asset watching, validation and future packing | docs/cli-integration.md |

Build and test from packages/atlas with pnpm; tests typecheck separately.
Every new exported function has an explicit return type. Keep new source files
under 300 lines and follow root docs/code-rules.md. Tests must remain self-contained;
the local ui-tps directories are read-only reference material, not CI dependencies.
