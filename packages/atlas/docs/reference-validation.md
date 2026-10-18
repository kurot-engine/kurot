# Atlas reference validation

Use the local read-only reference validator to check frame geometry and pixels
against supplied basis/basis_icon source and atlas files. Reference data is not
part of the npm package.

## Reference inputs and configuration

- Source images: `ui-tps/src/basis/*.png`, `ui-tps/src/basis_icon/*.png`.
- Reference outputs: `ui-tps/export/r_basis.{json,png,tps}`, `r_basis_icon.{json,png,tps}`.
- Project resources: `resource/assets/ui/app/r_basis.{json,png}`, `r_basis_icon.{json,png}`.
  Compare the selected baseline explicitly rather than assuming it matches runtime copies.
- TexturePacker 8.3 Egret export: single sheet, no rotation, POT, rectangular sheets
  allowed, maximum 2048², scale 1, RGBA8888 PNG, alpha threshold 1, trim margin 1,
  extrude 1, shape/border padding 0, and cleared RGB for fully transparent pixels.
  Auto-alias is enabled; alias behavior requires a separate fixture when relevant.

Use default packing options, with only the corresponding PNG filename
specified explicitly. The library does not read `.tps`; scope compatibility to the selected settings
and source sets.

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

The library does not emit TexturePacker's top-level `meta`; Core's
SheetAnalyzer does not read it. `meta.smartupdate` is TexturePacker update
metadata and must not retain an old value as if it described a new output.

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
