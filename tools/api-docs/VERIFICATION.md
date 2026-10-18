# API documentation verification — 2026-10-18

These results apply to the local checkout. Nothing was published, deployed or
submitted to the model evaluation harness. The GitHub workflow is configured;
no remote CI result is claimed.

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

Core 2.5.5, Game 2.0.1 and UI 3.6.1 are prepared locally and not published.
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
