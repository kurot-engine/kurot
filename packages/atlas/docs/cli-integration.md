# Atlas integration with CLI and optimization recommendations

Status: source analysis and sample validation from 2026-10-07. This document
proposes follow-up work. That validation did not modify CLI, Core, Editor or
Reskin, or add dependencies to consumers.

## Current pipeline

```text
Source images → @kurot/atlas → PNG + atlas JSON
                                  ↓ saved by the caller
resource/default.res.json → CLI reads resource defaults → KUI compilation
PNG/JSON under resource/  → CLI copyAssets              → build output
Atlas JSON/PNG in output  → Core SheetAnalyzer           → SpriteSheet / Texture
```

CLI does not parse atlas frame coordinates or PNG data when compiling KUI.
`src/core/kui/skin-module-builder.ts` reads `default.res.json` and uses
ui-document's `parseUIResourceConfigEntries` to obtain resources and nine-slice
defaults. `kui-parser.ts` applies resource defaults, Label presets and colors to
copies, in that order. `plugins/copy-assets.ts` copies resource files, excluding
authored KUI and generated theme files.

Core's `packages/core/src/kurot/resource/analyzers/SheetAnalyzer.ts` reads
`file/frames` at runtime and passes crop coordinates, offsets and original sizes
to `SpriteSheet.createTexture`. The verified output format is sufficient for
this pipeline; adopting the library does not require changes to CLI's KUI parser
or Core.

Atlas remains independent. Reskin/Editor resource services can call it. If CLI
later offers packing, CLI may depend on atlas; atlas must not depend on CLI/Core.
Copying or consuming prebuilt atlases requires no new dependency.

## First priority: resource updates reach the preview

Subsequent progress: the CLI working tree added whole-resource watching, batched
synchronization, deletion handling and no-store responses. CLI 3.3.1 is published;
installed CLI 3.3.0 lacks these capabilities and needs a dependency and lockfile
update. The gaps below describe the older implementation examined during the
analysis. See [CLI resource watching](../../cli/docs/dev-resource-watching.md)
for the current implementation and batch limits. Strict PNG/JSON transactions
remain future work.

At the time of analysis, `watchResources` in CLI's `src/core/dev-server.ts`
responded only to `.kui.xml`, `default.res.json` and `config/style.json`, and
required a project `ui` configuration. PNG and ordinary atlas JSON edits did not
trigger that watcher. A full build could copy new outputs, while the running dev
server could continue serving old resources. Source inspection confirmed this
gap; live watcher acceptance testing had not been performed at that point.

The recommended resource-change branches were:

| Change                                                                        | Recommended action                                                                  |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Atlas PNG / frame JSON, with unchanged resource names and nine-slice defaults | Validate the output pair, copy resources and notify the preview to reload           |
| Resource nine-slice defaults change in default.res.json                       | Validate the manifest, recompile affected KUI and copy resources                    |
| Colors / fonts / Label presets change in style.json                           | Use the existing style-resolution pipeline on copies and recompile KUI              |
| KUI changes                                                                   | Keep the existing compilation flow; Reskin does not expose this editing entry point |

An initial implementation can reuse copyAssets to establish correctness before
copying only changed files. Resource watching should also work without a `ui`
configuration, since Core-only projects need resource updates. Changes should
not require artificial edits or touches to KUI/default.res.json.

Renaming PNG and JSON separately does not create an atomic two-file transaction.
The caller should generate and validate temporary outputs, then commit the whole
pair. In one process, a commit-complete event can serialize copying. External
file watchers may use debouncing and bounded retries, but these cannot guarantee
that same-sized PNG/JSON files belong to the same generation. Strict consistency
across processes may require versioned directories with a single pointer switch,
or an explicit commit marker / generation protocol. Review that design separately.
Publish success only after grouped validation and copying finish. Preview refresh
must also account for Core resource caches and browser caches. A full-page reload
is more reliable for the first stage than clearing one subtexture. Do not add
undefined cache fields to output JSON.

## Second priority: resource integrity checks before building

Add a separate validation step before compilation/copying, without changing
authored KUI:

- A manifest sheet URL points to an existing JSON file, whose `file` points to a
  valid, existing relative PNG.
- PNG dimensions, integer frame fields, bounds, crop offsets and logical sizes
  agree. Reject unsupported rotation formats.
- Keep `subkeys` in object form. Compare them with actual frames and report missing
  or extra entries. In strict mode, fail on unresolved frame references, including
  the sheet name, resource path and frame name in the error.
- Validate resource-default `scale9grid` against untrimmed sourceW/sourceH. Do not
  recalculate it from atlas x/y or cropped w/h.
- Preserve existing name/alias precedence and distinguish duplicate bare frame
  names from usable `sheet.frame` references.

See `packages/ui-document/docs/resource-nine-slice.md` for the contract. The
existing manifest parser does not read PNG/frame files, so successful parsing
is not complete atlas validation. Pure format checks can live in a separate
tool module. Do not force Core or ui-document to depend on atlas just to read
prebuilt sheets. If a shared validator is introduced, consider a separate entry
without PNG encoding before deciding whether CLI needs the dependency.

Reskin preserves resource keys by default and replaces assets under existing
keys. Repacking does not require regenerating the whole manifest. Preserve frame
nine-slice values, unknown metadata, groups, URLs and resource order. Report key
set changes before applying them; do not silently remove or rewrite references.
Do not automatically adjust skins or layouts, or migrate local fields to presets.

## Third priority: incremental processing and optional packing

Cache outputs by source image content fingerprint, normalized options and library
version. A cache hit skips decoding, packing and encoding. Input path order does
not affect output; the existing determinism checks cover this.
CLI can read the manifest and each relevant sheet once per build to create a
resource index, avoiding repeated I/O for multiple skins. Coordinate changes do
not affect KUI compilation; default nine-slice or style changes affect generated
code. Reducing compilation through resource/style-to-skin dependencies first
requires complete reference tracking and deletion-event tests.

For an opt-in CLI packing plugin, the recommended order is:
`configuration validation → packing → grouped validation/commit → KUI compilation → copyAssets`.
Configuration must explicitly specify source/output paths, stable resource names
and packing options. Do not infer existing resource keys from directory scans.
A generic CLI project should not automatically repack existing PNG/JSON files.
Other consumers can continue calling the same atlas API directly.
Tools own paths, file commits, queues/workers and progress. The library continues
to return only in-memory results.

## Atlas optimization opportunities

Both new atlases match TexturePacker's area, so prioritize the update pipeline
and diagnostics. Experiments can compare PNG filter/deflate settings, alternative
lossless encoders and MaxRects sorting combinations, recording time, PNG bytes,
atlas area and peak memory. Choose strategies using several resource benchmarks.
Every strategy must pass RGBA, crop and extrusion checks again. Fewer PNG bytes
do not imply lower GPU memory use.

Pixel aliases provide no benefit for the two current samples. Rotation and
multipack would expand Core, manifest and tooling contracts, so they are outside
the current format-compatibility optimization scope. Lossy quantization,
discarding low-alpha pixels or reducing margin/extrusion cannot claim compliance
with the current pixel contract just because they reduce output size.

## Recommended acceptance order

1. Keep the `verify:reference` baseline and first complete grouped replacement and
   full-page preview refresh in Reskin/Editor.
2. Verify CLI dev updates for PNG/JSON-only replacement, resource deletion,
   interrupted external commits and Core-only projects.
3. Verify nine-slice logical dimensions, cropped icons, unchanged manifests,
   unmodified KUI and preserved preset references.
4. Introduce input caching, incremental copying or opt-in CLI packing afterward;
   measure each improvement and test rollback on failure.

Compatibility evidence is recorded in [reference-validation.md](./reference-validation.md).
