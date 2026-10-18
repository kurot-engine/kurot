# API documentation verification — 2026-10-18

The build/test results below apply to the local checkout at preparation time.
Publication verification is recorded separately below. The GitHub workflow is
configured; no remote CI result is claimed and no model evaluation was resumed.

| Package | Public export names | Public/protected member inventory, including inheritance | Missing reference entries | Compiled JSDoc examples |
| --- | ---: | ---: | ---: | ---: |
| @kurot/core | 167 | 2152 | 0 | 6 |
| @kurot/game | 33 | 480 | 0 | 6 |
| @kurot/ui | 88 | 4979 | 0 | 7 |

- Core, Game and UI builds pass. Existing tests: Core 941, Game 81, UI 371
  (1,393 total).
- Six documentation-tool tests pass, including deliberately dropped pages,
  stale output, broken links and transitive supporting types.
- Generated content and links pass `check`; all 19 JSDoc examples compile with
  strict TypeScript and declaration checking enabled.
- Real local tarballs retain every generated API file and matching SDK version.
  Their extracted consumer contains no engine `src/`; the same 19 examples
  compile against its packed declarations without loading implementation TS.
- Optional local HTML generation passed during the initial reference setup;
  this comment batch verifies the distributable Markdown and declarations.
- `git diff --check` passes. Existing SDK lockfiles and dependency declarations
  are unchanged; the private documentation tool has its own pinned new lock.

## Common game API JSDoc batch

This batch adds 319 JSDoc blocks and revises 69 existing blocks in 38 source
files. The comments cover display/graphics/text/input, timer/ticker, texture
ownership, audio/network errors, Tween options, MovieClip scheduling, particles,
UI constraints/skins, image loading, collection/renderer selection and binding
cleanup. Timer disposal and multi-Watcher binding cleanup have compilable recipes.

| Package | Previous comment gaps | Current gaps | Resolved exemptions |
| --- | ---: | ---: | ---: |
| @kurot/core | 1067 | 897 | 170 |
| @kurot/game | 116 | 102 | 14 |
| @kurot/ui | 514 | 380 | 134 |

Only resolved exemptions were removed from `comment-baseline.json`; no new gaps
were allowed. Constructors are not counted in that gap inventory, so the 318
resolved gaps differ from the 319 new blocks. Existing examples in the changed
source comments are retained.

An exact pre-batch snapshot covers all 265 Core/Game/UI source files. The
non-comment token sequence and TypeScript AST printed without comments compare
identically for every changed file. Twenty-one protected files also compare
byte-for-byte: SDK/package-tool manifests and locks, plus documentation-tool
implementation and tests. Existing implementations, signatures, exports, versions
and dependencies were unchanged during that comment batch. Patch-version
preparation is recorded below. The full API-documentation work is additionally
checked against its original pre-comment source snapshot.

The latest offline package check includes 2,552 Core, 560 Game and 5,165 UI API
files. It strictly compiles the 19 examples against the extracted packages,
without loading engine implementation TypeScript. All SDK builds, 1,393 SDK
tests and six documentation-tool tests pass for this batch.

Reference coverage is complete for the stated public surface. Behavioral JSDoc
coverage is separate: simple self-describing declarations and unfilled behavior
notes remain visible in each package's `coverage.json` and the explicit comment
baseline. This does not certify that every behavior has exhaustive prose.

Reproduce the local checks with the commands in [README](README.md).

## Patch-version preparation — 2026-10-18

At preparation time Core 2.5.5, Game 2.0.1 and UI 3.6.1 were not yet published.
Their manifests, READMEs, dated changelogs, context identities and generated API
version metadata are synchronized. All dependency sections, locks and other
package versions remain unchanged. Documentation adoption requires no consumer
migration; compatible installations may adopt these patches after publication.

The patch builds and SDK tests pass again: Core 941, Game 81, UI 371. The API
verification passes six tool tests, generated coverage/staleness/link checks,
19 strict-compiled samples and the source-free offline tarball check for all
three new versions. The existing evaluation-tool unit tests (13) and Star
Catcher typecheck/rule tests (4) also pass; no model evaluation was resumed.

A preparation snapshot compares 32 manifests/lockfiles: only the three requested
manifest version fields changed. Against the original API-work source snapshot,
all 265 source files retain identical non-comment ASTs; 60 files have comment-only
changes across the complete documentation work. `git diff --check` passes.

## Publication and UI workflow follow-up — 2026-10-18

Registry latest, exact-version metadata, downloaded tarball SHA-512 integrity
and all 8,277 API files are verified for Core 2.5.5, Game 2.0.1 and UI 3.6.1.
The API files match d081f6a, Core's game guide is present, and no engine src/
directory is shipped. See [publication history](../../docs/release-history.md#api-documentation-patches--2026-10-18).

The new UI authoring guide and ScoreHUD recipe are repository-only additions
after publication. Their four exact TS/XML fences are validated in an isolated
project using downloaded registry Core 2.5.5/UI 3.6.1/CLI 3.6.0, with existing
tool dependencies linked rather than installed/upgraded. CLI-generated theme,
custom namespace and typed parts are checked in development and release modes.
Strict source checking uses the game template's skipLibCheck=true.

The initial full declaration check with published CLI 3.6.0 reproduced TS2610:
generated ScoreHUD.skinParts was a property over Component's accessor. The
unreleased generator repair is recorded below. The API tool's independent 19
JSDoc samples use skipLibCheck=false and are separate from this generated
project case.
Browser behavior for the recipe must be verified in a host game's startup flow.

## CLI declaration fix — 2026-10-18 (unreleased)

The CLI generator now narrows host skinParts through a getter signature. The
compiler-based regression first reproduced TS2610 for four host discovery paths:
generic, explicit skinName, naming convention and configured component pair.
It now passes with strict=true and skipLibCheck=false, while separately checking
that incorrect value types, missing parts and readonly replacement still fail.
The test uses a minimal public getter contract to keep CLI tests independent
of Core/UI development dependencies.

The original complete ScoreHUD recipe is also rebuilt with the corrected CLI
checkout against the downloaded published Core 2.5.5/UI 3.6.1 packages. Both
development and release output pass `tsc --noEmit --skipLibCheck false`, with
the generated namespace, theme mapping and typed parts retained. No Core/UI
implementation or package/dependency/lock change is made; published CLI 3.6.0
still has the original defect until a later release includes this fix.

CLI build passes, and `pnpm --dir packages/cli test --maxWorkers=1` passes all
23 files / 114 tests. Initial sandbox execution blocked seven local-server
tests; with localhost access, parallel execution passed 112/114 but two watcher
tests timed out. The serial run retains their original assertions/timeouts and
passes the whole suite. All 278 protected Core/UI source and package-manifest/
lock snapshots remain unchanged. `git diff --check` passes; nothing is published.

## UI 3.6.2 / CLI 3.6.1 preparation — 2026-10-18

Only UI and CLI package versions change, to 3.6.2 and 3.6.1. All dependency
declarations/locks and Core/UI implementation sources remain unchanged. Earlier
unreleased checks above describe the preceding snapshot; neither new version
has been published. See [dependency impact](../../docs/api-documentation.md#ui-362-and-cli-361-authoring-patches).

- UI/CLI builds pass. UI passes 38 files / 371 tests; CLI passes 23 files /
  114 tests with maxWorkers=1 and localhost test access, without changing any
  assertions or timeouts. The declaration regression covers four host paths.
- API-tool tests pass 6/6. Regeneration/check records Core 167 exports / 2,152
  members, Game 33 / 480 and UI 88 / 4,979, with zero missing references.
  The 19 extracted examples pass strict compilation against built and packed
  declarations. Packed API counts remain 2,552 / 560 / 5,165; UI pages identify
  3.6.2 and Core/Game references are unchanged. Existing JSDoc gaps are unchanged.
- Offline local tarballs contain UI's new authoring/ScoreHUD guides and CLI's
  game/empty README/AGENTS entries plus the getter declaration fix. An isolated
  project uses those exact packed docs/templates and published Core 2.5.5, with
  existing tool dependencies linked rather than installed or upgraded. All four
  recipe fences compile in development/release modes with skipLibCheck=false;
  namespace resolution, exact part types and generated theme mapping pass.
  No engine source is present in that project. Browser acceptance remains a
  host-game responsibility; no agent evaluation or publication is run.
- `git diff --check` passes. Other SDK versions and consumer installations retain
  their baselines; new guide adoption and CLI regeneration are explicit choices.
