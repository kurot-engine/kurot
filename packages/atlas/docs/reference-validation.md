# basis / basis_icon format and pixel validation

Validation date: 2026-10-07 (Asia/Shanghai). Implementation: local `@kurot/atlas 0.1.0`.
Reference project: `CrashMaster/kurot-project-kui`, using the source images and
TexturePacker outputs updated for this validation.

## Results

All 61 resources across both sets passed checks for names, frame fields, crop
sizes, offsets, original dimensions and pixels. The new outputs work with the
existing resource format, without changing KUI, resource manifests or Core atlas
parsing. Placement coordinates differ, so PNG and JSON must be replaced together.
Format compatibility does not imply identical output bytes.

| Metric                                          | basis         | basis_icon    |
| ----------------------------------------------- | ------------- | ------------- |
| Source images / frames                          | 29 / 29       | 32 / 32       |
| Trimmed images                                  | 0             | 32            |
| TexturePacker atlas                             | 1024 × 1024   | 256 × 512     |
| atlas library output                            | 1024 × 1024   | 256 × 512     |
| Total frame rectangle area, excluding extrusion | 728,044 px    | 97,021 px     |
| Frames with different placement coordinates     | 26            | 32            |
| TexturePacker PNG size                          | 875,190 bytes | 158,473 bytes |
| atlas library PNG size                          | 909,753 bytes | 159,652 bytes |

The new PNGs are approximately 3.95% and 0.74% larger, respectively. There is no
atlas-area or GPU texture memory improvement in these samples. Both placement
and encoding affect PNG byte size; the difference cannot be attributed solely
to compression. This validation did not include a stable performance benchmark
or browser interaction/screenshot acceptance tests.

## Reference inputs and configuration

- Source images: `ui-tps/src/basis/*.png`, `ui-tps/src/basis_icon/*.png`.
- Reference outputs: `ui-tps/export/r_basis.{json,png,tps}`, `r_basis_icon.{json,png,tps}`.
- Project resources: `resource/assets/ui/app/r_basis.{json,png}`, `r_basis_icon.{json,png}`.
  Runtime PNG/JSON files for both sets are byte-for-byte identical to the export files.
- TexturePacker 8.3 Egret export: single sheet, no rotation, POT, rectangular sheets
  allowed, maximum 2048², scale 1, RGBA8888 PNG, alpha threshold 1, trim margin 1,
  extrude 1, shape/border padding 0, and cleared RGB for fully transparent pixels.
  Auto-alias is enabled, but neither set contains aliased frames.

Atlas used default packing options, with only the corresponding PNG filename
specified explicitly. The library did not read `.tps`; the validation scope is
these actual settings and the two resource sets.

## Validation coverage

`scripts/verify-reference.ts` and `scripts/reference-checks.ts` check:

1. Source image names exactly match the reference JSON frame set.
2. JSON uses `file` + `frames`. Each frame has integer `x/y/w/h` and optional
   `offX/offY/sourceW/sourceH`, with no rotation or nested format.
3. Reference and new PNGs are 8-bit RGBA. Frames and their 1 px extrusion fit
   within atlas bounds; extruded rectangles do not overlap.
4. Independently computed bounds contain source alpha ≥ 1, expanded by a 1 px
   margin and clamped to source bounds. Both reference and new crops match;
   discarded regions contain no nonzero alpha.
5. Each frame is restored to its source canvas using offX/offY. All retained
   pixels match channel by channel: fully transparent pixels have RGB checked
   against 0, and nonzero-alpha pixels have exactly matching RGBA.
6. Every pixel in the 1 px edge and corner extrusion matches.
7. Apart from x/y, old and new frames have identical field values and field presence.
8. Reversing input order produces identical new PNG bytes and JSON objects.
9. Reports retain source/reference SHA-256 hashes to identify the baseline after
   future source-image updates.

For example, `r_icon_bars` is cropped to 56 × 43 with offX/offY of 6/11, while
its logical size remains 64 × 64. Base resources `r_bg_stepper` and `r_txt_input`
are 180 × 60 and 140 × 60, respectively.

The new library does not emit TexturePacker's top-level `meta`; Core's
SheetAnalyzer does not read it. `meta.smartupdate` is TexturePacker update
metadata and must not retain an old value as if it described a new output.

## Actual CLI build validation

A temporary project copy used the sample's installed CLI 3.3.0 to build the
original atlases, then replaced only the two PNG/JSON pairs. Both development
`build --strict` runs and the replacement `build --release --strict` succeeded,
compiling 66 KUI skins each time. The real sample project was not modified.

- All 66 authored KUI files, `default.res.json` and `style.json` remained
  byte-for-byte identical to the original project.
- Development `default.thm.js` outputs were identical after normalizing CLI's
  random temporary directory name. Raw byte comparison differs because the
  generated-source comments contain `kurot-skins-<random>`.
- All four new atlas resources in development and release outputs were
  byte-for-byte identical to the packing results.
- Build validation confirms that the existing compilation/copy pipeline accepts
  these outputs. Frame pixel checks and Core's source contract support crop/offset
  compatibility; browser resource loading was not tested.

The installed CLI entry was invoked directly with
`node node_modules/@kurot/cli/dist/index.js ...`. In the temporary copy,
`pnpm exec` tried to verify dependencies and failed because the newly published
CLI/ui-document versions had not met minimumReleaseAge. The policy was not
relaxed, and dependencies were neither reinstalled nor replaced.

## Repeating the validation

Run from the engine repository root. The second argument must be a directory
that does not yet exist and is outside the sample project:

```sh
pnpm --dir packages/atlas verify:reference \
  /path/to/CrashMaster/kurot-project-kui \
  /tmp/kurot-atlas-reference-new
```

The script reads the sample project without modifying it and writes two PNG/JSON
pairs plus `report.json` to the new directory. Failures exit with a nonzero code.
It is a local reference-validation tool with no fixed developer path; it is not
part of default CI tests, and its scripts are not published. Rerun it after
baseline files change. An old report does not verify new files.

Local outputs from this run are at `/private/tmp/kurot-atlas-reference-20261007`,
with `cli-report.json` recording temporary-project build comparisons. These
temporary files are not distributed with the package.
See [cli-integration.md](./cli-integration.md) for follow-up integration and optimization.
