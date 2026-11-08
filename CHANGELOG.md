# Changelog

Repository-wide documentation, publication and application-adoption records.
Observations below describe their recorded event. Current package versions and
usage are indexed in [README.md](README.md); SDK changes are recorded in each
package's CHANGELOG.md.

## 2026-11-08 — Verified SDK publication and CLI 5.0.0 preparation

- Downloaded and verified the registry SHA-512 for CLI 4.1.3, Atlas 0.1.1, Core 3.2.3, Game 3.0.1 and ui-runtime 0.13.0. Clean builds of the release source reproduced all five npm archives byte for byte.
- The npm metadata records the earlier `gitHead` (`433a376a`). Use the annotated tags `@kurot/cli@4.1.3`, `@kurot/atlas@0.1.1`, `@kurot/core@3.2.3`, `@kurot/game@3.0.1` and `@kurot/ui-runtime@0.13.0` at `57e3f50a` for the matching source. Repository publication markers are updated separately from immutable package contents.
- Prepare CLI 5.0.0 only. Its Node minimum moves from 20 to 22.12.0. CLI and generated projects declare this requirement, and the repository and templates select Node 22 via `.nvmrc`. A CLI 4.x range or exact lock does not adopt 5.x automatically. Configs, KUI and browser SDK contracts are unchanged; application adoption is separate.
- CI builds and tests all nine packages on the Node 22 line, exercises the packed CLI on both the current 22.x and 22.12.0, and checks Core/UI in Chromium. Publication of CLI 5.0.0 is pending.

## 2026-11-08 — SDK review fixes prepared for publication

- Prepare CLI 4.1.3 and Atlas 0.1.1 for filesystem and PNG input boundaries; Core 3.2.3 and Game 3.0.1 for cancellation, player and sound ownership; ui-runtime 0.13.0 for collision-free instance keys and lookup helpers.
- Core 3.2.3 also fixes a one-sample overrun at the end of finite Web Audio loops, reproduced with a template MP3 and a deterministic PCM fixture.
- Keep existing dependency and peer minima. UI changes only the multiline browser test. No UI, ui-document, DragonBones or bitmap-font release is needed. Existing application installations and locks are unchanged. In particular, Editor/Studio must explicitly select ui-runtime 0.13.0 and audit special-character ID lookups to adopt it.
- All nine packages build and pass 2,555 package tests. Core passes 148 browser tests (including real MP3 loops), UI passes 42, and all six Linux visual checks pass. Core/UI benchmark smoke passes without a reference-machine regression gate.
- Install all five candidate archives together under strict peers: Star Catcher builds for development and release and passes all three browser cases on each output. All 22 API examples typecheck against built declarations and packed packages. Publication was pending at the time of this preparation.

## 2026-11-08 — Core 3.2.2 / UI 5.1.2 publication and application adoption

- Verify exact npm versions/latest tags, registry integrity records and UI's
  unchanged Core ^3.2.1 peer. Synchronize source publication markers; uploaded
  archives retain their original preparation documentation. No SDK is republished.
- Adopt Core 3.2.2 and UI 5.1.2 where used in demo, game, star-catcher,
  Card Booster, MilfMaster, Runaway, Skydive and Tentax. Preserve exact/caret
  declarations, CLI 4.1.2, Game 3.0.0 and other SDK/tool versions. All unrelated
  package records and integrity values remain unchanged; configured UI/Game/
  DragonBones/Spine packages resolve the same registry Core per application.
- Update current README/context references and per-game adoption records. Retain
  Skydive's release-age policy with explicit exemptions for the selected Core/UI
  patches. Editor, other SDK development locks and application code are unchanged.
- All eight strict-peer offline frozen installations, strict development/release
  builds and complete declaration checks pass. Existing unit suites pass all
  818 tests, plus architecture/resource/tool checks where provided.
- Demo/game pass 12 development/release WebGL/Canvas startup cases with runtime
  3.2.2, shared native UI identity, gallery button input and narrow-screen checks.
  Star Catcher passes all three gameplay/input/lifecycle browser cases against
  each build output, including repeated restarts and final listener cleanup.
- Templates pass development WebGL fixture checks for Card Booster interaction,
  Skydive component/lifecycle behavior, Runaway gameplay and Tentax navigation/
  disposal. MilfMaster's real-frame typing/wrapping/scroll regressions pass
  development WebGL and minified-release Canvas; native raster/outline comparisons
  pass development Canvas and minified-release WebGL. No application source or
  regression expectation changes are needed. Temporary browser servers close
  after verification; live backend integration is outside these fixture checks.

## 2026-11-08 — Core 3.2.2 / UI 5.1.2 preparation

- Prepare two patch releases: Core retains text overhang/italic/AA ink and
  restores mixed-height row-scroll access; UI reduces excess vertical outline
  space and shares horizontal italic protection across measurement, fitting and
  painting. Stable font frames, baselines and public signatures remain intact.
  Synchronize README/context/architecture indexes, runtime engineVersion and
  generated API references. Publication is pending.
- Keep UI's Core ^3.2.1 peer, compatible ^3.2.0 development range and registry
  3.2.1 lock. Recommend Core 3.2.2 with UI 5.1.2 for both fixes; publish Core
  first for that pairing, then UI. No unpublished registry resolution is added.
- Game/DragonBones Core ^3.0.0 and ui-runtime Core ^3.0.0 / UI ^5.0.0 peers
  accept these patches. Their SDK versions and supported minima stay unchanged;
  development lock adoption is optional. CLI's latest starters need no change;
  ui-document, Atlas and bitmap-font are unaffected.
- Demo/game and MilfMaster/Runaway/Tentax ranges accept the new patches with
  explicit installation/lock updates. Star Catcher pins Core 3.2.1; Card Booster,
  Skydive and Editor pin Core 3.2.1 / UI 5.1.1, so adopting them requires a
  manifest update. Reskin's Core ^2.5.4 still requires a separate major migration.
  This preparation changes no application or template dependencies.
- Both package builds and all 1,173 Core / 586 UI unit tests pass. API generation
  and coverage checks pass with no missing public entries; six documentation
  tooling tests and all 22 strict examples pass against both built and
  source-free packed declarations. Packed manifests and API metadata agree on
  Core 3.2.2 / UI 5.1.2. No npm package is published by this preparation.

## 2026-11-07 — Mixed-height text row-scroll correction

- Fix dynamic TextField's terminal row becoming unreachable after a taller
  row. Calculate its actual visible height from candidate row starts and gaps,
  retaining the more-than-half-row threshold and nominal input calculation.
  Cover a fitting 32px title and 16px body as the primary reproduction.
- The fitting-title, gap and exact-half-row regressions fail before the fix.
  All 24 added unit cases pass, including ordinary equal-height rows, input,
  resize, overlapping rows and the original large-font boundary.
- Core build and strict fixtures pass; all 1,173 Core and 586 UI unit tests
  pass. All twelve real Chromium/WebKit scrolling cases pass on Canvas,
  WebGL 1/2 and 1x/2x targets, comparing scrolled text with standalone pixels.
- Keep the correction in Core's Unreleased entry. No package version,
  dependency, application code or publication is changed by this fix.

## 2026-11-07 — Examples and Templates adopt the text-alignment patches

- Adopt registry Core 3.2.1 and UI 5.1.1 where already used in demo, game,
  star-catcher, Card Booster, MilfMaster, Runaway, Skydive and Tentax. Preserve
  exact/caret declarations, pnpm, other package versions and one shared Core
  per application. Current consumer documentation follows the installed patch.
- All eight strict-peer offline frozen installations, strict development/release
  builds and complete declaration checks pass. Existing unit suites pass all
  818 tests; architecture/resource/tool checks pass where provided.
- Demo/game ordinary and gallery routes pass 12 development/release startup
  cases across WebGL and Canvas, with runtime 3.2.1, native class identity,
  gallery button input, no browser/resource errors and a narrow-layout check.
  Star Catcher passes three browser cases for each output.
- Templates pass their existing development WebGL fixture suites: Card Booster,
  Runaway, Skydive lifecycle and Tentax navigation/disposal. MilfMaster's Drama
  typing regression passes development WebGL and minified-release Canvas;
  outline capture passes development Canvas and release WebGL. Its independent
  raster reference now uses stable font frames, retaining zero pixel tolerance.
- Template release builds/types pass; full gameplay, live-backend and complete
  renderer matrices are not repeated for this dependency-only adoption.
  No SDK bump, CLI starter edit or application publication is required. CLI
  starters already use latest. Editor is outside this adoption's final scope.

## 2026-11-07 — Core 3.2.1 / UI 5.1.1 publication

- Verify both exact npm versions/latest tags and the published UI Core ^3.2.1
  peer. Core was published before UI. Downloaded SHA-512/SHA-1 integrity and
  archive bytes match the tested preparation: all 3,295 Core and 5,720 UI files
  are identical. The same artifacts already passed the 84 text browser cases.
- Published UI's development range ^3.2.0 accepts Core 3.2.1 and is not a
  consumer runtime dependency. No metadata fix or repeat UI publication is
  needed. Refresh only the UI development installation/lock to registry Core
  3.2.1, preserve declared ranges/transitive versions and verify frozen offline
  installation. Published runtime/declaration output is unchanged.
- A fresh strict-peer registry consumer installs Core 3.2.1, UI 5.1.1, Game
  3.0.0, ui-runtime 0.12.0 and DragonBones 0.2.0 without conflicts. All resolve
  the same Core. ESM imports confirm engineVersion 3.2.1 and native Label /
  RichLabel object identity; all 22 API examples compile against registry types.
- UI build, all 578 unit tests and nine Canvas/WebGL Backdrop cases pass after
  adopting registry Core. Derive the browser version assertion from the installed
  manifest instead of a stale 3.2.0 literal. Synchronize source publication
  markers; immutable npm archives retain their preparation wording. No SDK
  version or application/template dependency is changed by this verification.

## 2026-11-07 — Core 3.2.1 / UI 5.1.1 preparation

- Prepare patch releases for stable dynamic font-frame alignment, consistent
  Label automatic sizing/textFit, preserved outline capture and RichLabel
  baseline/typewriter behavior. No public property or authored data format is
  removed. Tall fonts can measure higher or fit smaller inside fixed bounds.
  Both source versions are release preparations; publication is pending.
- UI requires Core ^3.2.1 for the new measurement contract. Publish Core first.
  Preserve UI's compatible ^3.2.0 development declaration and published 3.2.0
  lock for type compilation; behavior uses local and packed 3.2.1. Refresh that
  registry development lock after Core publication without inventing an
  unpublished registry resolution or committing a local package override.
- Game/DragonBones Core ^3.0.0 and ui-runtime Core ^3.0.0 / UI ^5.0.0 peers
  accept the patches. Their compatible development locks are optional adoption;
  no dependent SDK is bumped. ui-document/Atlas/bitmap-font are unaffected, and
  CLI's latest-based starters need no CLI or template change.
- Demo/game and MilfMaster ranges accept the patches after lock/install updates.
  Star Catcher may retain its exact Core 3.2.0, or deliberately adopt the patch.
  Editor's exact Core 3.2.0 / UI 5.1.0 require a separate application update to
  bundle this fix. Adopting UI 5.1.1 requires resolving Core >= 3.2.1 together.
  Reskin has no UI dependency and remains on Core ^2.5.4; Core 3 adoption is a
  separate migration. Application/template manifests and locks are untouched
  by this preparation; earlier adoption changes remain separate work.
- Synchronize package/root READMEs, context/architecture guides, agent version
  index, runtime engineVersion and generated API references. Keep original
  Backdrop API-introduction minima distinct from current package peer ranges.
- Clean Core/UI builds and all 1,146 / 578 unit tests pass. Source-free packed
  Core 3.2.1 / UI 5.1.1 pass 84 native browser cases across Chromium/WebKit,
  Canvas/WebGL 1/2 and 1x/2x. Coverage includes 31 languages, automatic/fixed
  frames, textFit, wrapping, Scroller edges, mixed rich runs and repeated typing.
  Guards verify one Core instance and runtime 3.2.1. All 22 strict API examples
  pass against built and packed declarations, with no implementation source or
  test/font fixtures shipped in the archives.

## 2026-11-07 — Examples and Templates adopt Core 3.2 / UI 5.1

- Update demo, game and star-catcher plus Card Booster, MilfMaster, Runaway,
  Skydive and Tentax to registry Core 3.2.0 and UI 5.1.0 where already used.
  Preserve exact/caret declarations, refresh pnpm locks and current SDK docs.
- Keep CLI 4.1.2, Game 3.0.0, document 0.14.0, DragonBones/Spine and other tool
  versions/integrity unchanged. All eight installations pass strict peers and
  offline frozen installation; native packages resolve one shared Core per app.
- All eight strict development/release builds and complete declaration checks
  pass. Existing architecture/tool checks and all 817 application tests pass.
- Demo and game's ordinary/gallery routes pass twelve development/release
  WebGL/Canvas startup, pixels, controls/list input and narrow-layout cases.
  Star Catcher passes its three browser cases for each output.
- Templates pass development WebGL browser checks: Card Booster and Runaway
  existing suites, MilfMaster's focused Slot KUI, Skydive's focused lifecycle
  and Tentax's existing component/navigation/disposal smoke. Template release
  validation covers strict builds/types; their full release/Canvas browser
  matrices are not repeated for this dependency-only adoption.

## 2026-11-07 — UI 5.1.0 publication

- Verify npm UI 5.1.0 exact/latest metadata, Core ^3.2.0 peer and downloaded
  SHA-512/SHA-1 integrity. All 5,720 archive files match the tested preparation
  byte-for-byte; synchronize repository publication markers. Immutable npm
  artifacts retain preparation wording. No runtime code changes follow publication.
- Downloaded UI 5.1.0 and Core 3.2.0 pass nine real Canvas/WebGL 1/WebGL 2
  Backdrop cases at 1×/2×/3× density, with 55 assertions per case and one
  source-free Core instance. All 22 strict API examples pass against those
  registry artifacts and the unchanged Game declarations.
- Include the completed Core/UI Backdrop implementation, tests, benchmarks,
  exports and release documentation in the engine commit. Application/template
  dependencies and other SDK manifests remain unchanged.

## 2026-11-07 — UI 5.1.0 preparation

- Bump UI to 5.1.0 for code-created Backdrop and its required Core ^3.2.0 API.
  Synchronize package/root READMEs, architecture/context guides, the Backdrop
  contract, agent version table and generated API references. Publication is
  pending; native UI wording cleanup is included in this release.
- Existing ui-runtime ^5.0.0 peers accept this UI minor. Keep other SDK versions
  and development locks unchanged. Examples/applications remain optional
  adoption; CLI's UI latest starter needs no dependency or CLI release.
- Clean UI build and all 481 unit tests pass. Generated coverage and all
  22 API examples pass against built/source-free packed declarations. The
  prepared UI 5.1.0 archive passes nine real Canvas/WebGL 1/WebGL 2 Backdrop
  cases at 1×/2×/3× density, 55 assertions each, sharing one packed Core 3.2.0.

## 2026-11-07 — Core 3.2 publication and UI Backdrop

- Verify npm Core 3.2.0 exact/latest metadata and downloaded SHA-512/SHA-1
  integrity; all 3,299 archive files match the tested release preparation.
  Synchronize repository publication markers; the immutable npm archive
  retains preparation wording. Published runtime output is unchanged here.
- Add unreleased UI Backdrop with standard layout, pass-through input and an
  owned Core effect node. Follow UILayer resizing without new subscriptions;
  bypass default Skins and intrinsic-size feedback. No KUI/CLI/runtime or SAO
  modification, application dependency adoption or UI version bump is included.
- Raise UI's Core peer/development minimum to ^3.2.0 and install the published
  dependency. Core owns all capture buffers and blur work. Other SDK versions,
  dependency minima and development locks stay unchanged.
- UI build, all 481 unit tests and all 30 browser cases pass against registry
  Core 3.2.0. New pixels cover all three backends at 1×/2×/3× density, ordered
  modals, transforms/clips, input, live updates, resizing and removal/recovery.
- Benchmark build, strict new fixtures and generated API coverage pass. All
  22 API examples compile against built and source-free packed SDK declarations.

## 2026-11-07 — Core 3.2.0 preparation

- Add a Core display-tree backdrop node with WebGL 1/2 GPU sampling, reuse of
  BlurFilter and pooled targets, plus a reusable Canvas approximation. Define
  ordered stacking, premultiplied alpha, transforms/clips, isolated parents and
  explicit cache restrictions. Core source is bumped to 3.2.0; publication is pending.
  UI Backdrop, SAO and application dependency adoption remain deferred.
- Add a live Core backdrop-blur example and the integration guide. Validate
  twelve real Chromium backdrop cases across backends/densities and single-sample
  capture, 50 related browser cases, 1,057 Core tests and strict builds.
- Optimize captures to the blur's working density and composite the actual
  transformed quad. Preserve canvas antialiasing and the native staging copies
  required by WebGL 1 / multisample defaults. Add a GPU timer-query benchmark
  and [M1 Max raw measurements](packages/core/examples/benchmark/backdrop/results/2026-11-07-m1-max.json).
  Full-resolution small-radius timings remain similar; large-radius intermediate
  idle storage falls substantially. Package CHANGELOG records conditions/results.
- Fix root resize command ordering, render-group effect wrapping and nonzero
  rectangle scissor origins encountered by the new pixel regressions.
- Release audit fixes nested Canvas sampling-failure state recovery and masked
  world-alpha/density parity. Preserve existing SDK peer minima; compatible
  development locks and selected applications remain unchanged.
- Validate all 21 API examples against built and packed declarations. The
  source-free Core 3.2.0 archive passes the same twelve backdrop browser cases
  and reports the matching runtime version. Core example/benchmark builds pass.

## 2026-11-06 — Examples and Templates adopt Core 3.1

- Update demo, game and star-catcher plus Card Booster, MilfMaster, Runaway,
  Skydive and Tentax to published Core 3.1.0. Preserve each project's exact/caret
  declarations; refresh registry installs, pnpm locks and active SDK documentation.
- Registry latest checks confirm the other adopted Kurot packages are current.
  Keep UI 5.0.0, Game 3.0.0, CLI 4.1.2, document 0.14.0, DragonBones 0.2.0,
  Spine 4.0 adapter 0.3.0 and Atlas 0.1.0 where already used. No SDK is bumped.
- All eight strict-peer registry installs and frozen offline installs pass.
  Strict development/release builds and complete declaration checks pass, with
  architecture/tool checks where provided and all 753 existing application tests.
- Dependency audits confirm one shared Core 3.1.0 per application and no changes
  to any other package version/integrity or unrelated manifest declarations.
- Expanded browser regression covers development/release on WebGL and Canvas
  for all eight projects. Demo covers startup/resize; Game covers both ordinary
  animated content and the KUI gallery; Star Catcher passes all twelve keyboard,
  touch, scoring, restart and disposal cases across the four configurations.
- All five Templates pass the full native browser workflows. Tentax now checks
  the actual compiled Main entry in both build modes, with shared Skin fields,
  component behaviors, betting/dialog flows and cleanup. Networking uses local
  protocol fixtures; production-service integration is outside these checks.
- Diagnose and fix a pre-existing MilfMaster BigWin browser test timing race:
  title screenshots could finish counting before a click assumed to skip it.
  Core 3.0/3.1 reproduce the same expected close. Separate title/manual cases,
  guard the manual tick pause with finally, assert automatic input delivery and
  use UI-condition waits; exact delay boundaries stay in controlled-clock unit
  tests. Add the focused --big-win-only runner. No production logic is changed.
- Release resource cache checks pass, including descriptor pages, fonts,
  cached resource responses and application JS reuse. Runaway's resource/asset
  provenance check passes. Complete results remain in local verification logs.

## 2026-11-06 — Core 3.1 publication verified

- Verify @kurot/core 3.1.0 and npm latest 3.1.0 against the official registry.
  Downloaded archive SHA-512 integrity passes; all 3,208 files and the compressed
  archive are byte-identical to the final tested release artifact.
- Confirm runtime engineVersion/API index 3.1.0, Texture.hitTestAlpha, removal
  of the base getPixel32 placeholder and preserved RenderTexture capture reads.
  The prepared build, 1,028 unit tests, 24 source/packed browser cases, 20 strict
  API examples and strict-peer consumer verification apply to the published code.
- Synchronize package/root READMEs, Core context/architecture and release status.
  The immutable npm archive retains its preparation-time publication wording.
  Other SDK versions, peers, development locks and application dependencies stay
  unchanged; no new package version is prepared here.

## 2026-11-06 — Core 3.1 release preparation

- Prepare Core 3.1.0 with Texture.hitTestAlpha for original trimmed-content
  alpha, atlas rotation/density handling, reusable Canvas sampling and exception
  recovery. The public instance method replaces the unreleased standalone helper.
- Remove the always-throwing base Texture.getPixel32 placeholder while preserving
  RenderTexture capture reads. Record the explicitly accepted minor-release type
  compatibility exception in Core's CHANGELOG; no compatibility shim is added.
- Synchronize runtime engineVersion, source manifest, current documentation,
  root package indexes and generated API references. Carry queued Core native
  capability wording into this release. Publication remains pending.
- Core's bitmap-font dependency is unchanged. UI/Game/DragonBones/ui-runtime and
  Spine retain accepted Core ^3.0.0 peer/development ranges; no consumer uses the
  removed base method. CLI and headless packages need no change. SDK/app locks,
  examples, Templates and SAO are not upgraded; hitTestAlpha adopters need 3.1.0.
  CLI starters already select Core latest and require no template/CLI release.
- Verification: Core build and all 1,028 unit tests pass. Fifteen source browser
  regressions and nine packed alpha cases pass on Canvas/WebGL 1/2, including
  independent output resolutions and readback recovery. API checks have zero
  missing entries; all 20 examples compile against built and packed declarations.
- A strict-peer temporary install with published UI/Game/DragonBones/runtime
  and all four Spine lines passes full declaration checking and resolves one
  packed Core 3.1.0 instance. Repository consumer manifests and locks stay intact.

## 2026-11-06 — Examples and Templates adopt Core 3

- Update demo, game and star-catcher plus the five external Templates games
  to published Core 3.0.0 and CLI 4.1.2. Existing UI/Game users adopt UI 5.0.0
  and Game 3.0.0; Core-only examples remain Core-only. Keep exact/caret styles.
- MilfMaster adopts DragonBones 0.2.0; Tentax adopts Spine 4.0 adapter 0.3.0.
  Keep document 0.14.0, Atlas 0.1.0, all other declarations and all non-Kurot
  lock versions. Each application resolves one registry Core 3 instance.
- Adapt the six old ticker receiver arguments in Card Booster startup/disposal
  and MilfMaster gift/confetti presentation. Existing arrow callbacks preserve
  instance ownership, timing and cleanup; authored skins/resources stay unchanged.
- All eight registry installs and frozen offline installs pass, together with
  strict development/release builds and complete declaration checks. All 753
  existing application/model tests pass; relevant architecture/tool checks pass.
- Browser checks pass for both demo builds and the game KUI gallery's native
  button, slider/progress, list and Skin-replacement behavior. Star Catcher passes
  all six development/release gameplay and lifecycle cases.
- Card Booster, Runaway and Skydive development/release browser regressions pass.
  MilfMaster's affected confetti passes development/release WebGL and development
  Canvas. Tentax's development fixture covers components, bets, dialogs and
  disposal; its release business browser scenarios are not rerun. Fixtures are
  local and do not establish live backend behavior. No SDK version is bumped.

## 2026-11-06 — Coordinated release publication complete

- Audit all nine engine packages and four Spine adapters against the official
  registry. Every source manifest version is published and matches npm latest:
  Core 3.0.0, UI 5.0.0, Game 3.0.0, CLI 4.1.2, document 0.14.0, runtime
  0.12.0, DragonBones 0.2.0, Atlas/bitmap-font 0.1.0; Spine 4.0/4.1/4.2
  adapters 0.3.0 and Spine 4.3 adapter 0.4.0.
- Verify CLI 4.1.2 archive SHA-512 and all 285 files against the tested
  preparation. The compressed archive is byte-identical; confirm document
  dependency ^0.14.0 and callback-only Tween.call in the game starter.
- Synchronize final CLI and root publication markers. No prepared SDK version
  remains unpublished. Source description/comment cleanup for already published
  Core/UI/Game/document stays queued for later patches; applications retain
  their own dependency adoption schedules. No new version is bumped here.

## 2026-11-06 — Runtime 0.12 publication verified

- Verify @kurot/ui-runtime 0.12.0 and npm latest 0.12.0. Downloaded archive
  SHA-512 integrity passes; all 167 files and the compressed archive are
  byte-identical to the artifact tested with published Core 3.0.0, UI 5.0.0
  and document 0.14.0. Its 90-test and packed strict-type validation still applies.
- Confirm peers Core ^3.0.0, UI ^5.0.0 and document ^0.14.0, package exports
  and shipped declarations. No dependency or lock changes are needed.
- Synchronize repository README and runtime publication markers. CLI 4.1.2
  remains prepared for publication; wording cleanup stays queued for later patches.

## 2026-11-06 — Native publications and runtime readiness

- Verify UI 5.0.0, Game 3.0.0, DragonBones 0.2.0, Spine 4.0/4.1/4.2 adapter
  0.3.0 and Spine 4.3 adapter 0.4.0 against exact registry versions and latest
  tags. All seven downloaded archives pass registry SHA-512 verification.
- Published UI/Game retain the earlier wording. Removing comments yields the
  same runtime code and declarations as the tested preparation. Reserve native
  description, guide and comment cleanup for later patches without bumping now.
- DragonBones matches the prepared archive byte-for-byte. Spine differs only
  in package.json indentation, with identical metadata, runtime and declarations.
- Correct ui-runtime's UI 5.0.0 lock integrity to the official published archive;
  keep Core ^3.0.0, UI ^5.0.0 and document ^0.14.0 peer/development ranges.
- Runtime frozen installation, build and all 90 tests pass with official Core
  3.0.0, UI 5.0.0 and document 0.14.0. ui-runtime 0.12.0 remains prepared for
  publication; CLI 4.1.2 follows. No consumer application is upgraded here.

## 2026-11-06 — Native engine and UI descriptions

- Replace broad EUI/Egret compatibility positioning with Kurot's own rendering,
  scene, event, KUI Skin, layout, binding and state contracts. Update package
  metadata, current guides, agent context and API comments/references.
- Keep explicit imported file-format support, parser names, migration docs,
  benchmark references, historical releases and third-party copyright/provenance.
- Refresh descriptions in the pending UI/Game/CLI releases. Core 3.0.0 and
  ui-document 0.14.0 are immutable published artifacts; their source wording
  changes remain unreleased. No package version or dependency range changes.
- Verification: 21 edited TypeScript files retain identical comment-free syntax
  and types. UI/Game/CLI/document builds pass; all 333 document tests pass.
  Generated API references have zero gaps; all 19 examples compile against
  built and source-free packed declarations. Runtime algorithms are unchanged.

## 2026-11-06 — Core 3 publication verified

- Verify @kurot/core 3.0.0 and npm latest 3.0.0 against the official registry.
  Downloaded archive SHA-512 integrity passes; all 3,206 files and the compressed
  archive are byte-identical to the previously tested release artifact.
- Confirm runtime engineVersion and API index version 3.0.0, callback-only
  ticker declarations and removal of Texture.getPixels/toDataURL.
- Update repository Core publication markers. The published archive remains
  immutable and retains the original preparation markers. Existing SDK Core 3
  lock integrities already match the registry; no dependency changes are needed.
- UI 5.0.0, Game 3.0.0, DragonBones 0.2.0, ui-runtime 0.12.0, CLI 4.1.2 and
  the four sibling Spine adapters remain prepared for publication. UI/Game/
  DragonBones/Spine can follow Core; runtime follows UI, and CLI follows Core/Game.

## 2026-11-06 — Core 3 coordinated release preparation

- Prepare Core 3.0.0, UI 5.0.0, Game 3.0.0, DragonBones 0.2.0,
  ui-runtime 0.12.0 and CLI 4.1.2. Publication remains pending.
- Require Core ^3.0.0 in UI/Game/DragonBones/ui-runtime; runtime also requires
  UI ^5.0.0. CLI keeps ui-document ^0.14.0 and no runtime Core/UI dependency.
- Synchronize runtime Capabilities.engineVersion, source manifests, dependency
  tables, package READMEs, callback contracts and generated API references.
- Prepare sibling Spine 4.0/4.1/4.2 adapters 0.3.0 and Spine 4.3 adapter 0.4.0
  for Core ^3.0.0 only; keep Spine runtime lines and rendering algorithms.
- Publish Core first, then native consumers and Spine adapters; runtime follows
  UI. Publish CLI after Core/Game so newly created game projects resolve the
  matching callback APIs. External applications/Templates are not upgraded here.

- Validation: all six engine builds and 1,882 tests pass; DragonBones full
  typechecking passes. CLI's default parallel run hit a 5-second process-test
  timeout; all 208 tests pass with two workers and unchanged test thresholds.
- All four Spine builds, strict source/test checks and 28 tests pass against
  prepared Core 3. Strict source-free consumers install with enforced peers;
  no third-party tool/runtime version updates are introduced in SDK locks.
- API verification has zero missing references; all 19 examples compile against
  built and packed declarations. Fourteen minified browser runs pass 64 checks:
  eight engine callback/transition/capture scenarios each on WebGL and Canvas,
  plus four Spine lines on Canvas/WebGL1/WebGL2 covering object identity,
  binary/atlas metadata, live animation pixels and listener cleanup.
- Registry-shaped SDK locks pass frozen offline installation using the prepared
  archive cache. No local file/link dependency or permanent override is committed.

### Callback ownership cleanup and initial source verification

- Remove Kurot-owned receiver parameters from Core ticker, UI Animation/Watcher/
  Binding and Game Tween callbacks/options. Keep stable function identity,
  callback snapshots, timing, forward-only steps and lifecycle ownership.
- Preserve the upstream DragonBones event receiver protocol. Adapt only its
  internal ticker driver to a stable arrow callback; keep imported runtime code
  and KUI/semantic document formats unchanged.
- Remove unsupported Texture.getPixels/toDataURL placeholders, their declarations
  and generated references. Keep real buffer operations and RenderTexture.getPixel32.
- Update native consumers, ui-runtime transitions, CLI starter and engine example
  calls. Initial validation retained published manifests/locks; the coordinated
  preparation above now assigns the incompatible releases. Templates/SAO remain
  on their existing dependency baselines.
- All six affected package builds and 1,882 unit tests pass, plus DragonBones
  full typechecking. Fifteen strict compiler negatives reject removed arguments,
  options and Texture members. New test files also pass complete strict checks.
- API generation/verification has zero missing references. All 19 examples compile
  against both built and source-free packed declarations. Packed Core/UI/Game/
  DragonBones/ui-runtime pass strict consumer types and eight browser scenarios
  on both WebGL and Canvas: ticker identity, binding, Animation/TouchScroll/
  ProgressBar, Tween, Timer, DragonBones receivers, numeric transitions and capture.
- Star Catcher passes strict types, four model tests, development/release builds
  and browser gameplay/lifecycle checks with the checkout Core; game also passes
  strict development/release builds. Cross-package validation uses temporary
  checkout peers, preserving the registry manifests and locks.

## 2026-11-06 — Examples and Templates adopt UI 4.2 / CLI 4.1.1

- Update CLI to 4.1.1 in demo, game, star-catcher and all five external Templates
  projects; existing UI consumers adopt UI 4.2.0. Core-only examples stay Core-only.
  Preserve each project's exact/ranged dependency style and refresh its independent
  registry installation and pnpm lock.
- Retain Core 2.8.0, Game, ui-document 0.14.0, animation adapters and other direct
  dependencies. Native packages resolve one shared Core instance, and each UI
  application shares document 0.14.0 with CLI. Application source and authored
  skins are unchanged; synchronize current README/context version baselines.
- All eight offline frozen installs, complete declaration checks and strict
  development/release builds pass. All 753 existing unit tests pass, alongside
  both architecture checks, Skydive tool types and Runaway resource verification.
- Development and minified-release browser checks pass for demo startup, game
  scene/gallery and Star Catcher gameplay/lifecycle; the gallery covers List
  selection/itemTap, ComboBox selection and Skin listener replacement.
- Card Booster, Runaway and Skydive pass their development/release browser
  regressions. MilfMaster's focused native condition-list checks cover changed
  data, account refresh, Skin replacement and reopening in both builds. Tentax's
  existing development smoke fixture covers compiled controls, betting, dialogs,
  history and disposal. Browser checks use local macOS Chromium and test-only
  protocol fixtures for networked applications.

## 2026-11-06 — UI 4.2.0 / CLI 4.1.1 publication verified

- Verify exact npm versions and latest tags as UI 4.2.0 and CLI 4.1.1. Download
  both registry archives and validate SHA-512 integrity and SHA-1 shasums.
  The archives are byte-identical to the tested preparation artifacts, including
  all 5,587 UI files and 285 CLI files.
- Confirm UI's Core peer ^2.5.2 and CLI's ordinary document dependency ^0.14.0.
  No new runtime dependency, peer minimum or unrelated SDK version is required.
- A fresh registry consumer passes strict development/release builds and a
  complete declaration check with skipLibCheck=false and noUncheckedIndexedAccess.
  It covers inferred/nullable list data, declared typed Skin fields and legacy
  renderer Skin arguments, with shared Core 2.8.0 and CLI document 0.14.0.
- Synchronize repository/package README and maintainer context to published
  status. Immutable registry archives retain the preparation wording shipped
  at publication. Examples and external Templates keep their existing manifests
  and locks pending explicit adoption.

## 2026-11-06 — Typed list data release preparation

- Prepare UI 4.2.0 for item-data generics across collections, list controls,
  renderers and events; keep unknown defaults and existing TSkin argument order.
  Nullable/sparse data, empty selection and runtime drawing behavior are preserved.
- Prepare CLI 4.1.1 to accept typed native list fields and distinguish SDK data
  parameters from Skin parameters. Keep native type/inheritance checks, concrete
  source-data constraints and non-data arguments checked; KUI format is unchanged.
- Keep UI's Core peer ^2.5.2, CLI's document dependency ^0.14.0 and unrelated SDK
  versions unchanged. ui-runtime's UI ^4.1.0 peer already accepts UI 4.2.0.
- CLI starter manifests keep latest lookups. Existing examples and external
  Templates keep their manifests and locks until explicit post-publication adoption;
  projects using typed KUI host fields need UI >= 4.2.0 and CLI >= 4.1.1 within 4.x.
- Synchronize package/root README, maintainer context, typed-list contracts and
  generated API identity. These source versions are not npm publication records.
- Verification: both package builds, all 465 UI tests and all 208 CLI tests pass.
  API validation reports zero missing references and compiles all 19 examples
  against built declarations and source-free packages. Prepared UI/CLI archives
  contain matching versions, README/CHANGELOG and unchanged dependency minima.
- One existing CLI style-watch test hit its 5-second timeout on the initial run.
  A subsequent isolated single-worker full run passes without code or timeout changes.

## 2026-11-05 — Examples and Templates adopt UI/CLI 4.1

- Update CLI to 4.1.0 in demo, game, star-catcher and all five external Templates
  projects. Existing UI/document consumers adopt UI 4.1.0/document 0.14.0.
  Preserve exact/ranged declaration styles and refresh each independent registry
  lock/installation; no project adds ui-runtime.
- Keep Core 2.8.0, Game and animation adapters at their existing versions. Verify
  shared native Core identity and matching application/compiler document versions.
  Application code and authored skins retain their existing behavior.
- All eight frozen installs, complete declaration checks and strict development/
  release builds pass, along with 753 existing unit tests, the existing architecture
  checks and Runaway resource validation.
- Browser checks pass for both development and minified release: demo startup,
  game scene/default UI gallery, Star Catcher gameplay/lifecycle and the five
  Templates. MilfMaster coverage focuses on KUI slot geometry, Sticky layers,
  spin modes, input and skin replacement; networked games use local fixtures.
- Synchronize example/template README baselines and template CHANGELOG records.
  Browser verification uses local macOS Chromium, not production backends or
  Windows/device acceptance.

## 2026-11-05 — RichLabel typography releases published

- Verify npm exact versions and latest tags: UI 4.1.0, ui-document 0.14.0,
  CLI 4.1.0 and ui-runtime 0.11.0.
- Download all four registry archives and verify SHA-512 integrity, archived
  versions and dependency declarations. Every archive is byte-identical to its
  previously tested release artifact; the prepared SDK locks remain valid.
- Confirm CLI's ordinary dependency is ui-document ^0.14.0; runtime peers are
  UI ^4.1.0, ui-document ^0.14.0 and Core ^2.4.0. The host must also satisfy
  UI's Core ^2.5.2 requirement.
- A fresh registry consumer install, strict declaration check and CLI release
  build pass with no diagnostics. CLI/runtime share document 0.14.0; native
  consumers share one Core 2.8.0/UI 4.1.0 instance.
- Synchronize repository README and context/architecture publication wording.
  Immutable npm archives retain the preparation wording shipped at publication.
  Editor, SAO, examples and external Templates retain their existing versions.

## 2026-11-05 — RichLabel component typography release preparation

- Prepare UI 4.1.0, ui-document 0.14.0, CLI 4.1.0 and ui-runtime 0.11.0.
  RichLabel component properties supply omitted Span appearance; local fields
  remain explicit and textFlow snapshots are not rewritten.
- Reuse Core fallback/rendering and scalar XML/state machinery. Keep Core
  2.8.0, UI's Core minimum ^2.5.2, semantic format 2 and unrelated SDKs unchanged.
- CLI adopts document ^0.14.0; runtime adopts UI ^4.1.0/document ^0.14.0 and
  validates UI 4 materialization with one shared accepted Core instance.
- Editor, SAO, examples and external Templates keep their existing source,
  manifests and locks until publication and an explicit adoption task.
- Publication order: UI/document independently, then CLI/runtime after their
  respective prerequisites. Source version preparation is not npm publication.
- Verification: all four clean builds, 1,062 unit tests, 21 native text browser
  checks and 12 source-free packed browser cases pass. Packed development and
  release output covers Canvas/WebGL1/WebGL2 on Core 2.5.2 and 2.8.0, with one
  shared Core/UI instance in each consumer. API generation, declaration examples,
  frozen offline installs and identical clean-build archives also pass.
- CLI process/watch tests showed intermittent timeouts during verification;
  the final single-worker full run passes all 181 tests without timeout changes.
  CLI/runtime locks record the prepared UI/document archive integrity; these
  artifacts remain unpublished and are not registry publication verification.

## 2026-11-04 — Examples and Templates adopt UI 4 / CLI 4

- Update registry UI/CLI declarations and pnpm locks in game, demo and
  star-catcher examples; retain Core 2.8.0 and other SDK dependencies.
- The game gallery uses declared fields and named handlers, removing skin-part
  casts and releasing handlers on replacement. Strict development/release builds,
  full declarations and browser clicks, Slider/progress updates, panel reopening,
  replacement and field cleanup pass. Core-only demo startup also passes in both modes.
- Star Catcher retains Core-only gameplay; four unit tests and all three browser
  cases pass in both development and minified release output. One initial browser
  run timed out; a complete rerun passed without source or test changes.
- Separately update the five external Templates projects to registry UI/CLI 4.
  Business KUI views and their concrete-view consumers adopt declared fields;
  generic framework enumeration and Skin metadata retain their intended APIs.
  Application changes and validation are recorded in each project's CHANGELOG.
- All eight selected consumers pass frozen installation, strict development/release
  builds and complete declarations. The six projects with unit suites pass 750
  tests. All five Templates pass development browser interaction; release checks
  pass for Card Booster, Skydive, Runaway and focused MilfMaster presentation paths.
  Tentax's existing compiled-field/auto-bet smoke harness covers development.

## 2026-11-04 — UI 4.0.0 / CLI 4.0.0 publication

- Verify both exact npm versions and latest tags as 4.0.0. Download the registry
  archives and verify SHA-512 integrity; all 5572 UI and 277 CLI archived files
  match the prepared release, including runtime fields and build-time checks.
- Synchronize repository README/context publication status and release entries.
  Published archives retain their preparation-time documentation.
- Commit the SDK release before adopting it in engine examples and external
  Templates. Core, Game, ui-document and ui-runtime versions remain unchanged.

## 2026-11-04 — UI 4.0.0 / CLI 4.0.0 preparation

- Prepare default host-field Skin binding in UI and semantic declaration checks
  in CLI as independent major releases. Views use declare fields and direct access;
  view-specific helpers receive the concrete view. Keep framework part enumeration.
- Centralize field ownership, native validators/setters, conflict preflight and
  cleanup in Component. Validate before installing KUI outputs and on source watch
  rebuilds; retain last good outputs and retry after corrected Skin input.
- Synchronize manifests, current READMEs/guides, architecture/context/version tables
  and generated UI references. These are local candidates for user publication.
- Preserve Core peer/dev ^2.5.2 and UI's registry 2.5.3 lock; preserve CLI's
  ui-document ^0.13.0 and registry 0.13.2 lock. Move TypeScript to CLI's ordinary
  dependencies without changing its locked 5.9.3 version or unrelated tooling.
- ui-runtime 0.10.0's UI ^3.4.0 peer excludes UI 4. Its adoption needs separate
  validation and release; no dependent SDK version/peer is silently changed.
  Existing application UI 3 / CLI 3 ranges and exact pins need explicit adoption.
- Defer CLI starter files, engine example consumers and all external Templates
  until publication, as requested. Publish UI 4 first, then CLI 4; consumers can
  adopt both after registry verification.
- UI build/442 tests and CLI build/176 tests pass. Generated API checks report
  no missing entries; all 19 examples compile against built and source-free
  packed declarations. New UI tests also pass strict declaration checking.
- Packed UI/CLI with downloaded, integrity-verified Core 2.8.0 pass module/global
  development/release builds, full consumer type checks and browser interaction:
  direct fields, base-constructor binding, concrete-view helpers, clicks, Slider
  dragging, skin replacement, old listener cleanup and field release.

## 2026-11-02 — UI 3.7.1 publication

- Verify the exact npm version and latest tag, download the registry archive,
  and validate SHA-512 integrity and SHA-1 checksum. All 5542 archived files
  match the prepared release byte for byte, including 348 dist and 5190 docs
  files, the UILayer implementation, declarations and versioned API references.
- Run all eight UILayer regressions against downloaded UI 3.7.1 / Core 2.8.0
  public entry points. All 19 API examples and the regression fixture pass
  strict declaration checks without engine source. Local build and all
  418 UI unit tests pass with the existing Core 2.5.3 development installation.
- Synchronize README/context publication status and the package release entry.
  Immutable npm archives retain their preparation-time status text. Keep all
  versions, dependency/peer ranges and application/development locks unchanged.

## 2026-11-02 — UI 3.7.1 preparation

- Prepare the UILayer resize/listener-lifecycle fix as a compatible UI patch.
  Synchronize the manifest, package/root README, context/version table and
  generated API references. This is a local candidate for user-managed publication.
- Keep Core ^2.5.2 peer/dev requirements and the registry 2.5.3 development lock.
  ui-runtime's UI ^3.4.0 peer/dev ranges accept this patch; its older lock is
  optional adoption. No other SDK requires a compatibility change or release.
- Keep CLI starter latest placeholders and all application dependencies/locks.
  examples/game and MilfMaster/Runaway/Tentax accept the patch through ^3.7.0;
  Card Booster/Skydive/Editor/SAO and native Skia projects have exact UI pins
  and need a deliberate manifest/installation update when adopting it.
- Clean UI build and all 418 tests pass. Generated API/version checks and all
  19 strict examples pass against built and packed declarations. Source-free
  packed UI 3.7.1/Core 2.8.0 verifies resize-driven child layout, Stage-bound
  preservation and listener cleanup across removal and stage changes.

## 2026-11-01 — Example SDK adoption

- Adopt registry Core 2.8.0 and CLI 3.9.0 in demo, game and Star Catcher, plus
  UI 3.7.0 in game. Preserve compatible ranges in demo/game and exact pins in
  Star Catcher. Core-only examples acquire no UI/Game runtime dependency.
- Synchronize manifests, installations, pnpm locks and current README baselines.
  Keep Game 2.0.1, ui-document 0.13.2 and unrelated tooling unchanged; game/UI
  resolve one Core instance. Lock changes include CLI's required CSS parser.
- Frozen installation, strict development/minified-release builds and full
  declaration checking pass for all three examples. Star Catcher's model tests
  and all six development/release browser tests pass for gameplay, input,
  pause/restart, narrow layout and final teardown.
- Development and release browser checks pass for demo startup and game's
  ordinary scene/native UI gallery, including default skins, list data and a
  real pointer click on the gallery button. No script or HTTP resource errors.

## 2026-11-01 — Core 2.8.0 / UI 3.7.0 / CLI 3.9.0 publication

- Verify all three exact npm versions and latest tags, download their registry
  archives, and validate SHA-512 integrity and SHA-1 checksums. Core's 3209,
  UI's 5542 and CLI's 252 archived files match the locally prepared releases
  byte for byte, including expected package paths and source-free declarations.
- Confirm UI 3.7.0 contains the final Image source-revision and BitmapLabel
  disposed-context error fixes, their updated API contracts and lifecycle guide.
- Run all 24 async regressions against downloaded Core/UI public entry points;
  compile 19 API examples against source-free declarations. Downloaded CLI passes
  six strict module/global development/release builds and native context/Theme
  execution; unchanged Game/DragonBones/ui-runtime share the published Core/UI.
- Synchronize repository README/context publication status and package release
  entries. Immutable npm archives retain their preparation-time status text.
  Preserve versions, dependency/peer ranges and application/development locks.

## 2026-11-01 — Core 2.8.0 / UI 3.7.0 / CLI 3.9.0 preparation

- Prepare independent feature releases for decoded ImageBitmap sources and
  explicit upload cleanup in Core, local UIContext/radio-group ownership in UI,
  and module Skin exports in CLI. Synchronize runtime engineVersion, package/root
  READMEs, current contracts, context/version tables and generated API references.
  These are local release candidates; no npm publication is performed here.
- Preserve every dependency range, peer minimum, installation and lock. UIContext
  works on the existing Core ^2.5.2 contract; only ImageBitmap adoption needs Core
  >= 2.8.0. Module compilation needs CLI >= 3.9.0 and local UIContext needs UI
  >= 3.7.0, within their current majors. Core's bitmap-font and CLI's ui-document
  dependencies remain unchanged.
- UI, Game, DragonBones and ui-runtime Core peers accept 2.8.0; ui-runtime's UI
  peer accepts 3.7.0. No dependent SDK needs a compatibility migration/release.
  Compatible example/application ranges can opt in after publication. Exact
  Star Catcher/Core/CLI and Card Booster/Skydive Core/CLI pins need an explicit
  adoption change if selected. Templates and examples keep their current locks;
  starter latest placeholders and default global registration remain.
- Clean builds and 1001 Core / 410 UI / 161 CLI unit tests pass. Two browser
  WebGL 1/2 regressions verify actual ImageBitmap pixels, updates, ownership and
  context restoration. Generated Core/UI APIs report zero missing entries;
  19 extracted examples compile against built and source-free packed declarations.
- Source-free Core/UI/CLI packages pass strict module/global development/release
  builds, local/default/nested Skin execution, fonts, late radio binding,
  disposal and global Theme loading. Exact registry Core 2.5.2 passes UI's peer
  minimum runtime/type checks. Unchanged packed Game/DragonBones/ui-runtime share
  the target Core/UI, and the complete loader passes skipLibCheck=false.
- Checked local archives include current declarations, compiled helpers, guides
  and generated API files; whitespace and version/dependency audits pass.
- Fix follow-up UI async boundaries: Image revokes superseded same-name replies
  at source assignment; BitmapLabel checks context disposal on both success and
  error. Add 24 regressions and verify the external three-case reproducer passes.
- Check the public npm registry on 2026-11-01 before publication: Core 2.8.0,
  UI 3.7.0 and CLI 3.9.0 are absent (exact-version requests return 404); latest
  remains 2.7.0 / 3.6.2 / 3.8.1 respectively. Keep the prepared versions and
  include the follow-up UI fixes in 3.7.0.

## 2026-11-01 — CLI 3.9.0 preparation

- Prepare CLI 3.9.0 for user-managed publication with optional module Skin
  registration, frozen factory exports in both modes, and documentation for
  resolving the generated theme's development/hashed release module URL.
  Synchronize package/root README, architecture/context and source version table.
- Preserve ui-document ^0.13.0 and the existing 0.13.2 development lock. No
  SDK depends on CLI at runtime. UIContext integration uses separate unreleased
  UI source; UI remains 3.6.2 and is not prepared/published by this CLI change.
- Consumer adoption is optional: demo/game and MilfMaster/Runaway/Tentax ranges
  accept 3.9.0. Star Catcher, Card Booster and Skydive exact pins require an
  explicit manifest update if selected. Starters retain latest placeholders;
  application manifests, installations and locks are unchanged here.
- Clean CLI build and all 161 tests pass (29 files), including six native ESM
  development/release registration cases and accepted/invalid configuration.
  Packed CLI/local UI source integration passes with registry Core 2.5.3 and
  2.7.0 for simultaneous contexts, defaults, nested factories, fonts and disposal.
  The complete loader example and public config compile with strict types and
  skipLibCheck=false. Archive contents/version and diff whitespace checks pass.
- These are local preparation checks, not npm publication verification.

## 2026-10-30 — Core 2.7.0 / CLI 3.8.1 publication and Templates adoption

- Verify both exact versions and npm latest tags, download the registry archives
  and verify their SHA-512 integrity. Core's 3205 files and CLI's 251 files match
  the prepared archives byte for byte, including the new resource protocol.
- Synchronize repository README/context publication status; immutable published
  archives retain their preparation-time documentation.
- Adopt the registry releases in card-booster, milf-master, runaway, skydive and
  tentax manifests, independent pnpm locks and installations. Preserve exact pins
  versus compatible ranges and unrelated direct dependency versions. Update
  Skydive's exact release-age exceptions to the two selected versions.
- Synchronize current Template READMEs, agent baseline and release instructions
  with ordinary registry usage; local SDK substitutions are no longer required.
- All five frozen installs, strict development/minified release builds and full
  declaration checks pass, with 743 combined unit tests. Required architecture
  and Skydive tool checks pass. Each installed UI/Game/animation adapter resolves
  the application's same Core 2.7.0 instance.
- Registry-based release browser checks pass for all five: Card Booster opening /
  controls / startup, MilfMaster Welcome / locales and cache, Skydive lifecycle,
  Runaway game / independent entrance, and Tentax native entrance / real Spine.
  Output audits retain root js/resource paths, generated JS hashes and automatic
  release metadata. These checks use local fixtures rather than live backends.

## 2026-10-30 — Core 2.7.0 and CLI 3.8.1 preparation

- Replace the whole-build directory scheme with matching Core/CLI source
  changes: CLI publishes its existing release timestamp as HTML metadata, Core
  versions local resource requests, and generated JS retains its current hashes
  and paths. No generated base or asset-directory relocation remains.
- New CLI starters enable resource versioning. Adopt the helper for native
  font/config/Theme/video requests in all five Templates; remove Runaway's
  directory-copy release wrapper and update cache/deployment documentation.
- Prepare Core 2.7.0 and CLI 3.8.1 for user-managed publication, with dated
  package entries, current README/context versions and regenerated API indexes.
  These versions are not yet published. Publish Core first, then CLI.
- Native helper adoption requires Core >= 2.7.0 within 2.x and release query
  metadata requires CLI >= 3.8.1 within 3.x. Other SDK peers already accept Core
  2.7.0; their versions, real API minima and development locks remain unchanged.
  Demo/game ranges accept both releases as optional adoption. Star Catcher
  retains exact older pins and needs explicit manifest/lock adoption if selected.
  Templates require explicit adoption of both releases after publication; their
  manifests/installations and locks retain the registry baseline in this change.
- Core/CLI builds and 986/144 tests pass. All five Templates pass strict dev/
  release, full declaration checks, 743 combined unit tests and release browser
  regressions. The two-publish cache fixture and both CLI starter browser checks
  pass, including resource queries and unchanged generated JS URL structure.
- Verify local npm archives include the new public helper, plugins and starter
  wiring, exclude the removed legacy plugin, and pass packed-package cache /
  starter build, type and browser integration checks.

## 2026-10-30 — Example stage-configuration adoption

- Adopt registry Core 2.6.0 and CLI 3.8.0 in demo, game and Star Catcher,
  updating their independent manifests, installations and pnpm locks. Preserve
  Star Catcher's exact pins and the other examples' compatible ranges.
- Game also adopts UI 3.6.2 and Game 2.0.1, retaining ui-document 0.13.2.
  Verify that UI and Game resolve the application's same Core instance.
- All three entries use `createPlayer({ canvas })`; existing kurot.config.ts
  stage settings supply the generated canvas defaults. Validate the demo/game
  canvas before creating Player and remove Star Catcher's unused size imports.
- Synchronize example READMEs and native-gallery maintenance instructions with
  the registry installation. Checkout source bindings are optional maintenance
  tools, not prerequisites for the ordinary gallery.
- Frozen installation, strict development/minified release builds and full
  declaration type checks pass for all three. Star Catcher's four model tests
  and six development/release browser tests pass, including input, scoring,
  ending, restart, narrow layout and teardown.
- Development and release browser checks pass for demo startup and both game
  routes. The gallery checks native buttons, text input, toggles, animated
  slider/progress synchronization, panel close/reopen and mobile pointer mapping,
  with no application script, console or resource errors in the completed runs.
- All three actual dev processes accept saved width/frame-rate changes and
  restoration through generated HTTP canvas attributes without restarting.
  Original stage configurations are restored. No SDK implementation, version,
  compatibility minimum or development lock changes are included.

## 2026-10-30 — CLI 3.8.0 publication

- Verify npm exact version and latest as CLI 3.8.0, with Core latest 2.6.0.
  Download the published CLI archive, verify registry SHA-512 integrity and
  compare all 243 files byte for byte with the tested preparation checkout.
  The configuration watcher, diagnostics, guides and both new starters are included.
- Synchronize CLI's repository README/context and release publication status.
  Core 2.6.0 and CLI 3.8.0 are both published; the CLI's new template runtime
  prerequisite is available. Preserve earlier dated preparation/publication
  snapshots and the immutable package documentation.
- No further SDK bumps or application/example dependency adoption are included.
  Existing build, 957 Core / 145 CLI unit-test and both browser-backend results
  apply to the verified published code; this follow-up changes documentation only.

## 2026-10-30 — Core 2.6.0 publication

- Verify npm exact version and latest as Core 2.6.0. Download the published
  archive, verify registry SHA-512 integrity and compare all 3200 files byte
  for byte with the tested preparation checkout. Stage-option resolution,
  declarations and generated API metadata are included.
- Synchronize Core's repository README/context/architecture publication status.
  The immutable npm archive retains the documentation from preparation.
- CLI 3.8.0 remains prepared and unpublished, with npm latest still 3.7.0.
  Its new starters' Core prerequisite is now available. No SDK/application
  dependency declarations, locks or installations are adopted here.

## 2026-10-30 — Core 2.6.0 and CLI 3.8.0 preparation

- Prepare Core 2.6.0 for per-field canvas stage defaults and CLI 3.8.0 for
  validated stage configuration watching, atomic HTML updates and canvas-only
  game/empty starters. Both are feature releases; publication is pending.
- Synchronize manifests, README files, context/version indexes, startup and
  watching contracts, and generated Core API references. Preserve historical
  release records and feature-introduction minimums.
- Publish Core first, then CLI. New starters need Core >= 2.6.0 within 2.x;
  the template registry placeholders remain. Existing UI/Game/DragonBones/
  ui-runtime and compatible Spine peers already accept Core 2.6.0, so their
  package versions and compatibility minima remain unchanged.
- SDK development locks and application/example installations are not adopted
  here. demo/game's ranges accept both releases as optional adoption;
  Star Catcher's exact Core 2.5.4 / CLI 3.7.0 pins need explicit declaration
  changes if selected later. Existing explicit startup options retain priority.
- Core build/declarations and 957 tests pass; CLI build and 145 tests pass.
  The two real browser backend runs pass dev save/reload, recovery, overrides
  and release startup. API generation/consistency and all 19 strict examples
  pass against built and source-free packed SDKs. Core's API files match 2.6.0;
  the CLI archive includes all 243 expected files. Registry checks confirm both
  target versions are unpublished.

## 2026-10-28 — Published CLI/document dependency adoption

- Verify registry ui-document 0.13.2 (323 files) and CLI 3.7.0 (239 files)
  by downloading their archives and checking SHA-512 integrity against npm.
  Synchronize current publication status while preserving dated preparation
  and older publication snapshots.
- Adopt the releases in 19 selected installation directories: CLI/ui-runtime
  development, Tauri Editor, Studio, Reskin, Reskin-Next API, Skia/tooling hosts,
  the Mobile game example, engine examples, Runaway/Skydive/Tentax/MilfMaster,
  DemoWorkspace/Test1 and the MilfMaster welcome prototype. Keep CLI and
  ui-runtime's ^0.13.0 compatibility ranges and SDK versions unchanged.
- Check compiler-owned document resolution as well as direct dependencies.
  Correct retained 0.13.1 compiler copies in Mobile/Studio; verify Studio's
  corrected graph with frozen installation and 11 actual-CLI regressions.
  Exact fresh-release exceptions name only the selected CLI/document versions,
  retaining the projects' other release-age policies.
- Prepare Skia 0.1.6 for its changed dependency metadata: exact CLI 3.7.0 and
  document 0.13.2, with build, 45 Node tests and a 147-file package/export check.
  It is not published. The native test host uses this file package; registry
  Skia Demo keeps 0.1.5, whose internal 3.6.0/0.13.1 compiler chain requires
  publication and adoption of Skia 0.1.6 before it can be replaced.
- Tauri passes its build/type checks, 436 unit tests and 12 Rust tests.
  Four new regressions cover numeric RadioButton labels, other ToggleButton
  subclasses, states, formatting and native component previews. All 61 Runaway
  skins pass read-only validation/round trips using the installed kernel.
  Rebuild an ad-hoc-signed 0.29.0 App separately from the running trial;
  its code signature verifies. GUI/native-window suites are not rerun here.
- CLI passes 132 tests, ui-runtime 77, Studio's selected integration suite 76,
  Reskin 141, and the selected API checks 43. Updated games pass their affected
  strict development/release builds and existing unit/type checks. MilfMaster's
  registry CLI passes the previous cache/versioned-resource regression without
  its retired 3.6.0 patch reference.
- Electron Editor is explicitly excluded and its repository remains unchanged.
  Branch/main reorganization, commits and online publication are deferred as
  requested; this adoption does not publish another SDK or desktop artifact.
- All 19 selected installations pass frozen-lock verification. All 58 affected
  build/type/unit/lint steps pass, with Skia's separate build/tests/package and
  the compiler-resolution/cache rechecks above. `git diff --check` passes in
  all 13 affected Git repositories; DemoWorkspace/Test1 is a plain directory.

## 2026-10-28 — ui-document 0.13.2 preparation and dependency audit

- Prepare ui-document 0.13.2 for the built-in Button-subclass XML string fix.
  Public exports, semantic format 2 and foundation catalog membership remain
  unchanged. Source/docs versions are synchronized; publication is pending.
  Registry checks still report document 0.13.1 and Skia 0.1.5 as latest.
- CLI's ^0.13.0 ordinary dependency and ui-runtime 0.10.0's ^0.13.0
  peer/development ranges accept the patch. Their development locks still use
  0.13.0 and may adopt independently; neither SDK needs another version or
  higher compatibility minimum. CLI 3.7.0's existing release preparation is
  separate from this fix.
- Published Skia 0.1.5 pins document 0.13.1. Delivering the fix through that
  SDK requires a dependency change and a Skia patch release, such as 0.1.6.
  Skia Demo pins Skia 0.1.5 and document 0.13.1; adopting both is explicit.
  The local Skia native test app also pins document 0.13.1.
- Tauri Editor 0.29.0, Electron Editor 0.28.6, Studio, Reskin-Next API and
  Skydive pin document 0.13.1. They need declaration/lock updates when adopting.
  Bundled products must rebuild; an already released product needs a new
  artifact version under its own release rules. An unpublished product version
  can include the dependency change before its first release.
- Reskin, Runaway, Tentax, MilfMaster, DemoWorkspace/Test1 and the MilfMaster
  welcome prototype accept the patch through ^0.13.1. Existing 0.13.1 locks
  remain optional adoption; no blanket application version bumps are needed.
- demo/game/star-catcher currently install CLI 3.3.1, which depends on document
  ^0.11.0. To adopt this fix they must update that CLI installation, for example
  to compatible CLI 3.6.1. demo/game's ^3.3.1 ranges accept it; star-catcher's
  exact pin needs an explicit declaration change. game additionally installs
  document 0.13.0 directly, which does not replace the compiler's 0.11.x copy.
  Verify both direct and transitive parser resolutions after any adoption.
- The game/empty scaffolds retain latest placeholders and resolve registry
  versions when creating new projects; no template version change is required.
  The Mobile game example's CLI 3.6.0 already accepts document ^0.13.0.
  Core, UI, Game, DragonBones, Atlas, bitmap-font, Spine and Mobile SDKs have no
  relevant kernel dependency and need no release for this fix.
- Build and all 319 document tests pass. The packed 0.13.2 artifact has 323
  files and works with unchanged CLI 3.6.1 for Button-family code generation
  and state labels. No dependent SDK/application manifest, lock or installation
  is modified. See [package notes](packages/ui-document/CHANGELOG.md#0132--2026-10-28).

## 2026-10-27 — CLI 3.7.0 preparation

- Prepare CLI 3.7.0 for publication with optional content-addressed release
  asset directories, the game starter's Theme URL correction and HTML parsing
  regressions. This is a minor configuration feature; publication is pending.
- CLI adds build-time parse5 ^7.3.0 and retains ui-document ^0.13.0. Other SDK
  versions, peer minima and development locks are unchanged.
- Existing compatible CLI ranges may adopt the release through their own
  installation/lock and rebuild. Exact pins need declaration updates when
  adopting the feature; application/template/example installations are unchanged.
  See [CLI release notes](packages/cli/CHANGELOG.md#370--2026-10-27) and
  [release assets](packages/cli/docs/release-assets.md).

## 2026-10-18 — Documentation organization

- Keep API indexes, README files, context maps and guides focused on current
  contracts, usage, compatibility requirements and verification commands.
- Consolidate historical publication/adoption records here and in package/tool
  changelogs. Preserve the earlier source documents in Git history.

## Published SDK snapshot — 2026-10-18

At 14:06 UTC, each exact registry version and latest tag below matches its
source manifest. These are published SDK versions; application installations,
SDK development locks and feature-introduction versions are separate baselines.

| Package | Verified npm latest |
| --- | --- |
| [@kurot/core](https://registry.npmjs.org/@kurot%2fcore/2.5.5) | 2.5.5 |
| [@kurot/ui](https://registry.npmjs.org/@kurot%2fui/3.6.2) | 3.6.2 |
| [@kurot/game](https://registry.npmjs.org/@kurot%2fgame/2.0.1) | 2.0.1 |
| [@kurot/cli](https://registry.npmjs.org/@kurot%2fcli/3.6.1) | 3.6.1 |
| [@kurot/ui-document](https://registry.npmjs.org/@kurot%2fui-document/0.13.1) | 0.13.1 |
| [@kurot/ui-runtime](https://registry.npmjs.org/@kurot%2fui-runtime/0.10.0) | 0.10.0 |
| [@kurot/atlas](https://registry.npmjs.org/@kurot%2fatlas/0.1.0) | 0.1.0 |
| [@kurot/dragonbones](https://registry.npmjs.org/@kurot%2fdragonbones/0.1.0) | 0.1.0 |
| [@kurot/bitmap-font](https://registry.npmjs.org/@kurot%2fbitmap-font/0.1.0) | 0.1.0 |

UI/CLI package downloads and SHA-512 integrity are rechecked below. Other SDK
publication checks retain their earlier artifact evidence; this snapshot
rechecks their version metadata without changing dependencies or installations.

## Recorded releases and adoption

### UI authoring and CLI declaration patches — 2026-10-18

[CLI 3.6.1](https://registry.npmjs.org/@kurot%2fcli/3.6.1) is published. Its latest
tag, downloaded tarball and SHA-512 integrity are verified; all 234 files match
prepared commit 46459e97. Both game/empty templates contain README/AGENTS entry
docs, and the compiled generator emits getter-based host skinParts declarations
compatible with skipLibCheck=false. Runtime Skin output is unchanged.

[UI 3.6.2](https://registry.npmjs.org/@kurot%2fui/3.6.2) is now published and
verified, including latest, downloaded tarball and SHA-512 integrity. The archive
has 5,520 files, including 344 compiled/declaration/map files, 5,165 API files,
the standard production/directory guide and complete ScoreHUD recipe. It is
byte-identical to the local package used for preparation checks in 46459e97.
Runtime/API files match the checkout; subsequent status edits affect only docs.

The earlier 14:03 UTC check returned UI latest=3.6.1 and HTTP 404 for 3.6.2.
The 14:06 UTC recheck confirms 3.6.2 and supersedes that pending status.

Kurot-Studio adopts exact registry CLI 3.6.1 in commit 048e5c1, updating only its
CLI pin and corresponding lock version/integrity. All other direct and transitive
dependency resolutions remain unchanged. Offline frozen installation with
lifecycle scripts disabled, the Host/renderer/preload build, complete format/
code-rule/boundary/type checks and 175 test files / 1,451 tests pass. Its real
CLI development and release integration baselines now check 3.6.1. Existing games
keep their own CLI installations. The application is not published or pushed.

Core/UI implementations and engine dependency ranges/locks are unchanged.
Other SDKs and applications retain their own adoption schedules. Published
archives retain their preparation-time documentation; these post-publication
status updates apply to the repository and do not replace an npm artifact.
See [dependency impact](CHANGELOG.md#ui-authoring-and-cli-declaration-patches--2026-10-18)
and [verification](tools/api-docs/VERIFICATION.md).

### API documentation patches — 2026-10-18

Published versions and their registry latest tags were verified on 2026-10-18:

| Registry version | Bundled API files | Checked content |
| --- | ---: | --- |
| [Core 2.5.5](https://registry.npmjs.org/@kurot%2fcore/2.5.5) | 2,552 | API reference and game-authoring guide |
| [Game 2.0.1](https://registry.npmjs.org/@kurot%2fgame/2.0.1) | 560 | API reference and public docs/ packaging |
| [UI 3.6.1](https://registry.npmjs.org/@kurot%2fui/3.6.1) | 5,165 | API reference and JSDoc examples |

All three downloaded tarballs pass their registry SHA-512 integrity check.
Every API file matches commit d081f6a byte-for-byte; each archive includes public
declarations and excludes engine src/. No consumer source, peer minimum or
dependency lock change is required to read these references. These checks do
not update application installations or publish any further package.

The standard UI authoring guide and ScoreHUD recipe were added to the repository
after UI 3.6.1 publication, so they are not inside that archive. Published CLI
3.6.0 was latest at that earlier check, and its downloaded game template contains
neither the newly added README nor AGENTS.md. Those future template docs need a
separate CLI release to reach new scaffolds; existing projects need their own
instruction entry. The CLI download also passes its registry integrity check.

Core 2.5.4 is published, verified on npm on 2026-10-12, including latest, package
download, registry integrity and all 628 generated files matching the tested
build. It fixes continuous
SoundChannel Web Audio loops, including finite counts on the audio clock, initial
offsets, position and cleanup. Existing `loops` semantics are preserved.
HTML unlimited fallback uses native looping; finite fallback remains browser-timed.
Published 2.5.3 lacks this correction. SDK dependency ranges and development locks
are unchanged; existing peers accept 2.5.4 without dependent SDK bumps or raised
minima. Editor 0.28.5 uses exact registry Core 2.5.4 with a matching Bun lock and
rebuilt local trial App; no remote release is initiated. Reskin and the selected
Templates/tentax and Templates/milf-master adopt ^2.5.4 with matching registry
installations/locks and rebuilt outputs. The demo/game examples also adopt ^2.5.4
and rebuild; other SDK and independent Reskin project installations are unchanged.
Tentax's unchanged MP3 and music manager were verified through an isolated checkout
bundle; its newly minified release is checked against repeated decoded samples.
Read packages/core/docs/audio-playback.md.

UI 3.6.0 is published, verified on npm on 2026-10-11, including latest, package
download, integrity and all 344 generated files matching the tested build. It reserves
outline-safe Label layout space, including automatic dimensions, wrapping and
fitting. Outlined Label sizes and line breaks can change; use explicit top for
progressively typed dialogue. The Core peer/dev range rises from ^2.4.0 to ^2.5.2
for public line ink metrics and unified glyph-block alignment. UI development
installs registry Core 2.5.3 with a matching lock; the 2.5.2 minimum is tested
separately. Core, CLI and ui-document need no new release. Runtime 0.10.0's
peer/dev UI ^3.4.0 already accepts 3.6.0, provided its host satisfies UI's Core peer.
Editor 0.28.3 adopts exact registry UI 3.6.0 with a matching Bun lock and ordinary
local App build. The explicitly selected Templates/tentax and Templates/milf-master
adopt ^3.6.0 with matching registry installations/locks and rebuilt outputs.
The game example's existing range accepts it; its installation/lock and other
SDK development locks are unchanged. Reskin has no
direct UI dependency. The MilfMaster harness can substitute a test bundle via
--ui-trial without modifying dependencies.

UI 3.5.0 is published, verified on npm on 2026-10-10, including latest, package
download and registry integrity. Its Label fitting/alignment modules match the
published build.
The published 3.5.0 baseline extends Label shrink
to complete multiline layouts, with outline allowance, stable alignment frames,
nominal automatic dimensions and unchanged authored line modes. Published UI
3.4.0 remains single-line only. Core peer ^2.4.0, APIs, KUI/resource formats and
other SDK versions are unchanged. Published 3.5.0 developed against Core 2.4.0.
Runtime 0.10.0's peer/dev UI ^3.4.0 accepts 3.5.0 without a new SDK release.
The game example (^3.1.0) may update its installation/lock and rebuild separately.
At the 3.5.0 adoption, Templates/tentax and Templates/milf-master declared
UI ^3.5.0, with matching registry installations/locks and rebuilt outputs.
CLI's new-game template resolves latest on create; existing projects are unchanged.
Editor 0.28.2 is a local trial with its Inspector restriction removed and fitting
alignment corrected. Its installation/lock and ordinary App build use exact
registry UI 3.5.0 and one Core 2.5.3; the temporary UI source binding is removed.
Other applications and SDK development locks retain their own installations.
Core-only SDKs, the document kernel, CLI and independent
Reskin projects need no release. Read packages/ui/docs/label-text-layout.md and
docs/dependency-policy.md for required versus optional consumer adoption.

Core 2.5.3 and ui-document 0.13.1 are published, verified on npm on 2026-10-10. TextField
and BitmapText now default to middle, inherited by Label, RichLabel, BitmapLabel
and EditableText. Explicit top/bottom and state overrides remain effective;
multiline controls only line generation. Dynamic alignment uses the existing
unified glyph block; input retains stable editing rows and overflow scrolling.
BitmapText retains bitmap-font line metrics. The headless catalog records middle
for all four UI text types without inserting omitted properties into XML.
Use explicit top for content intended to begin at the top of a taller box.
UI/Game/DragonBones/Spine/ui-runtime peers accept Core 2.5.3; no new SDK versions
or higher minima are required. CLI 3.6.0/runtime 0.10.0 already accept document
0.13.1 through ^0.13.0. Their development locks are unchanged. Editor 0.27.5,
Reskin, Tentax and MilfMaster explicitly install registry Core 2.5.3 and document
0.13.1 with matching locks and rebuilt outputs. Editor removes its rich-text top
fallback and restores the native instance default; 0.27.5 is a local trial, not a
remote release. Other applications and independent Reskin projects are unchanged.
Atlas and the bitmap-font kernel are unchanged.
Read packages/core/docs/text-layout.md and packages/ui-document/docs/text-layout.md.

Core 2.5.2 is published; npm latest, package download and registry integrity
were verified on 2026-10-10. Its alignment/rendering modules match the tested
local build. Dynamic top/middle/bottom now share one
complete glyph block, independent of multiline. Input uses stable nominal editing
rows in all modes; overflowing input remains top-aligned for caret scrolling.
Nominal measurements and public/dependency/XML contracts are unchanged. In 2.5.2,
TextField and ordinary Label default to top; button caption skins explicitly use middle.
Dynamic top/bottom captions can move from 2.5.1. Existing UI/Game/DragonBones/Spine/
ui-runtime peers accept the patch without new SDK versions or higher minima.
At the 2.5.2 adoption, Editor 0.27.4, Reskin, Tentax and MilfMaster installed
registry Core 2.5.2 with matching locks and rebuilt outputs. Editor 0.27.4
was committed and its release tag pushed; CI completion was not awaited. Read packages/core/docs/text-layout.md. UI/CLI/headless
packages require no release. MilfMaster's omitted button caption alignments are
now explicitly middle, including ButtonPlainBlueSkin.

Core 2.5.1 is published; npm latest, package download and registry integrity
were verified on 2026-10-10. Its published block-alignment modules match the
tested local build. Dynamic middle alignment centers the complete glyph block
independently of multiline, retaining blank rows and relative row baselines/spacing. INPUT uses
stable editing rows; top/bottom and nominal measurements are unchanged. Block
bounds are cached with the line layout and shared by drawing, link hits and
render padding. Read packages/core/docs/text-layout.md. No public API, dependency
or XML/resource-format change is required. SDK peers accept this patch without
new versions. At the 2.5.1 adoption, Editor 0.27.3, Reskin, Tentax and
MilfMaster installed registry Core 2.5.1 with matching locks and rebuilt
outputs. Editor 0.27.3's release tag has been pushed; CI completion was not
awaited. Other SDKs and CLI are unchanged. Other
applications and independent Reskin projects retain their own installations.

Editor 0.27.5, Reskin and the explicitly selected Templates/tentax and
Templates/milf-master now install registry Core 2.5.3/document 0.13.1 with matching app locks.
Editor and both templates install CLI 3.6.0; Reskin keeps CLI project-owned.
The demo/game templates use the engine example's native KUI skins, palette and
2× atlas, replacing their EUI defaults. Tentax and MilfMaster synchronize only
their web loading page and logo with the CLI game template. Editor frame measurements and
grid writes are logical; Reskin grid authoring/validation is logical while source
PNG replacement sizes remain physical and repacking retains resolution. Existing
independent Reskin projects and other consumers are unchanged. No SDK bump is required.

Atlas has a portable pixel-only root entry and a separate Node PNG subpath using
pngjs. No current package consumes it. Core loads prebuilt sheets without atlas;
Editor, Reskin or CLI adoption is a separate change.
Core 2.5.0 and CLI 3.6.0 are published, verified on npm on 2026-10-10, including
latest tags, package downloads and registry integrity. Published Core includes
the density/text/scissor fixes. Published CLI includes 16 XML skins, the 2× atlas,
mascot logo and build corrections. Its actual create command generates Core
^2.5.0, UI ^3.4.0 and CLI ^3.6.0. Source versions alone do not confirm publication.

Core 2.5.0 adds independent immutable Texture/SpriteSheet source density, with
physical sampling and logical frame dimensions/trim/grids. Existing 1× resources
retain their behavior. It fixes shared alphabetic/ink text alignment, preserving
stable multiline/input font frames and nominal layout sizes; restores the root
WebGL target after the first scratch allocation; and encloses fractional physical
scissor bounds to retain ItemRenderer edge pixels. Nested/rotated stencil clips
are unchanged. Read packages/core/docs/texture-density.md and text-layout.md.

CLI 3.6.0 ships 16 native XML skins, a Kurot-owned rounded 2× atlas (512×512,
sheet resolution: 2), palette colors and a looping mascot brand splash. XML sizes
and nine-slice grids stay logical. Default Button padding is symmetric and Panel
titles use middle alignment. It also preserves development constructor names
for Theme lookup and omits empty runtime asset directory trees after KUI filtering.
Read packages/cli/docs/default-ui-skins.md. The new game skin kit requires
Core ^2.5.0. `create` resolves registry SDK versions; template placeholders remain
latest and existing projects retain their own resources and locks.

Private tools/default-ui-assets uses registry Atlas 0.1.0 and pinned resvg;
CLI and runtime SDKs gain no atlas dependency. It generates the game template
and examples/game assets. An isolated native gallery links built checkout Core
and installed registry UI/Game/document without editing application installations.
The game example has an explicit document dependency for project font/style setup.

UI, Game, DragonBones, Spine and ui-runtime peers already accept Core 2.5.0;
no dependent SDK bump, raised peer minimum or development-lock update is required.
CLI retains published document ^0.13.0. Apps adopt Core installation/lock and
rebuild explicitly. Projects adopting the new 2× skin kit require Core ^2.5.0;
Editor/Reskin authoring adoption also needs logical frame measurements derived
from sheet density. Their installations are unchanged. UI/document APIs,
resource-manifest/KUI formats and all seven other package versions are unchanged.

DragonBones is maintained in `packages/dragonbones`, with a Core ^2.1.1 peer
and no UI/Game dependency. `src/runtime` contains the official TypeScript
sources adapted to ESM and compiled with the adapter directly to `dist`.
Imported types and object-pool contracts are retained; original commit and
hashes are recorded in `upstream.json` for provenance. See the package
instructions before editing the runtime. Version 0.1.0 is published and develops
against published Core 2.2.0 without local overrides. No current game consumes
this package.

Core 2.4.0 is published, verified on npm on 2026-10-09. It adds independent
centered flipX/flipY and the reflection-frame hook, without changing authored
negative-scale semantics. UI 3.4.0 and ui-document 0.13.0 are published, verified
on npm on 2026-10-09. UI requires Core ^2.4.0 and installs the registry release
with a matching pnpm lock. CLI 3.5.0 development now installs document 0.13.0;
ui-runtime 0.10.0 development installs all three published peers with one shared
Core and a matching registry lock. CLI 3.5.0 and runtime 0.10.0 are published, verified on npm on 2026-10-09.
Editor 0.24.0 explicitly adopts all five registry SDKs. Game/DragonBones/Spine
need no release; other applications and templates retain their own dependencies.
Read docs/centered-flips.md for the published contracts and consumer adoption order.

Published CLI 3.6.0 has an asset-copy correction that omits empty runtime directory
trees after filtering KUI sources, including skin-only resource/ui. Generated
theme JSON and compiled Skin modules remain required; mixed directories retain
runtime files, and template copies preserve empty directories. Registry CLI 3.5.0
does not include the correction. Adoption needs a CLI 3.6.0 installation and a
project rebuild, without engine changes or dependency/format migration.
