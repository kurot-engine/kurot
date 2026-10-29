# Changelog

All notable changes to `@kurot/cli` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and CLI command/configuration APIs follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
The early KUI XML contract follows the pre-1.0 `ui-document` kernel; authored
format changes are documented explicitly in each release.

## 3.8.0 — 2026-10-30

Published; exact version, npm latest and downloaded archive SHA-512 integrity
verified on 2026-10-30.

### Added

- Watch root ESM TS/JS configuration stage defaults in dev, including atomic
  replacement saves. Re-evaluate the root module, validate values and atomically
  publish HTML on the existing server; manual refresh applies the new defaults.
- Retain valid HTML after malformed edits and recover after correction; report
  restart-required diagnostics for structural configuration changes. Add
  `config-change` JSONL events and stage width/height/orientation validation.
- Update game/empty starters to canvas-only Player startup using Core >= 2.6.0
  within 2.x. Keep explicit runtime options available as per-field overrides.

### Compatibility and adoption

- This minor release adds configuration watching to `kurot dev`. Stage defaults
  apply after a successful HTML update and manual browser refresh; running
  Players are not reconfigured. `build --watch` retains its existing behavior.
- Root ESM configuration is re-evaluated; imported helpers and structural
  changes still require restarting dev. Shared configuration loading now rejects
  invalid width/height/orientation values for build, dev and clean commands.
- Core 2.6.0 is published, providing the required canvas-attribute startup for
  newly created game/empty projects. Template latest placeholders and registry
  resolution remain; CLI does not acquire a Core runtime dependency.
- ui-document remains ^0.13.0, with development lock 0.13.2. Other SDK versions,
  peer minima, installations and locks are unchanged. Existing CLI ^3.x ranges
  accept optional adoption; exact pins require an explicit declaration update.
- JSONL clients receive the added `config-change` build reason and the
  `KUROT_CONFIG_RELOAD_FAILED` / `KUROT_CONFIG_RESTART_REQUIRED` diagnostic codes.

### Verification — 2026-10-30

- Build and all 145 tests pass (27 files), including TS/JS root configuration
  reloads, atomic replacement saves, invalid-value retention/recovery,
  restart-required diagnostics and generated HTML.
- Integration with built Core 2.6.0 passes the real dev save/manual-refresh and
  release startup checks on WebGL and Canvas 2D, including explicit overrides
  and recovery on the same server process without browser errors.
- The 243-file local package includes the compiled configuration watcher,
  diagnostics, watching guide and both canvas-only starters with their Core
  2.6.0 requirement. ui-document remains ^0.13.0; no Core runtime dependency
  is added.
- The published archive contains 243 files, all matching the tested preparation
  checkout byte for byte. npm latest is CLI 3.8.0 and its required Core startup
  behavior is available in published Core 2.6.0. Repository publication-status
  updates follow verification; the npm archive retains preparation-time docs.

## 3.7.0 — 2026-10-27

Published on npm; registry version, downloaded archive and integrity verified on 2026-10-28.

### Registry adoption — 2026-10-28

- Verify the published 239-file archive and its SHA-512 integrity. Adopt
  ui-document 0.13.2 in the development lock without changing the ^0.13.0
  compatibility range; build and all 132 tests pass.
- Selected SDK/application/example installations adopt registry CLI 3.7.0.
  MilfMaster no longer applies its earlier 3.6.0 patch; the published feature
  passes its existing same-name-resource/cache verification. Electron Editor
  retains its current installation at the user's explicit request.

### Added

- Optional `output.versionedAssets` release packaging: place runtime files in
  `assets/<content-hash>/` and emit an HTML base URL, covering same-name resource
  updates, generated themes, atlas/font pages and page-shell assets. Identical
  output reuses the version; development and existing configurations keep their
  paths. Root manifest and reported script paths use the version prefix.
- Validate the option and reject conflicting HTML base elements before moving
  output. Add regressions for same-name replacements, deterministic versions,
  generated KUI, shell/script changes and disabled/development builds.

### Changed

- The game starter resolves its Theme URL against document.baseURI so compiled
  skin imports follow the selected release directory with existing UI runtimes.

### Fixed

- Parse release HTML with parse5 before inserting the versioned base URL.
  Preserve quoted attribute values containing greater-than signs and ignore
  base-like text in scripts/styles. Keep the authored template intact, require
  an explicit head and reject actual conflicting base elements.

### Compatibility and adoption

- This minor release adds an opt-in configuration field. The default paths,
  development/watch behavior, commands and KUI/resource formats retain their
  existing contracts. ui-document remains ^0.13.0; Core/UI and other SDKs need
  no new release or higher peer minima.
- Add parse5 ^7.3.0 as a CLI dependency for HTML parsing. Its entities dependency
  supports the CLI's Node.js >= 20 baseline; it is not shipped in game bundles.
- Projects enabling versioning need CLI >= 3.7.0 within 3.x, an absolute Theme
  config URL based on document.baseURI and the deployment rules in
  docs/release-assets.md. Existing projects may keep versioning disabled.
- demo/game use ^3.3.1, and the selected Tentax/MilfMaster templates use ^3.6.0;
  these ranges accept 3.7.0 as optional installation/lock adoption. Star Catcher
  pins 3.3.1, and Editor/Studio pin 3.6.1; adopting this feature requires explicit
  declaration updates. Their installations/locks are unchanged by preparation.
- Bundled template latest placeholders remain; create records the running CLI's
  version range. New scaffolds from 3.7.0 receive the Theme URL correction.
  Other SDK peers/development locks and unrelated applications are unaffected.

### Adoption

- MilfMaster enables versioning using a committed pnpm patch to its installed
  registry CLI 3.6.0. The patch carries the release feature without upgrading
  runtime SDKs or depending on another checkout. No npm publication is claimed.

### Verification — 2026-10-27

- Clean CLI build and all 25 test files / 132 tests pass with maxWorkers=1,
  including quoted HTML attributes, script/style text, release process
  configuration and generated KUI output. git diff --check passes. An earlier
  parallel run hit a resource-watch batch-reason assertion; its isolated rerun
  and subsequent full runs passed.
- The packed 3.7.0 archive contains 239 entries, including the compiled version
  plugin, release deployment guide and corrected game starter. Its metadata
  declares parse5 ^7.3.0 and the unchanged ui-document ^0.13.0 requirement.
- MilfMaster's same-browser-cache fixture keeps its old immutable response
  cached while the next deployment loads the changed resource, atlas page and
  font through a new version directory; uncached old-version lazy loads remain
  available. Actual minified game startup passes on WebGL and Canvas.

## 3.6.1 — 2026-10-18

Published; verified on npm on 2026-10-18, including latest, downloaded tarball
SHA-512 integrity and all 234 files matching prepared commit 46459e97.

### Fixed

- Emit getter signatures when narrowing host skinParts in generated module
  augmentations, preserving Component's accessor contract. This fixes TS2610
  with skipLibCheck=false without changing runtime Skin output or Core/UI.
- Add compiler regression coverage for generic, explicitly named, conventionally
  named and configured reusable hosts. Preserve exact part types and read-only
  access; reject wrong values, unknown parts and attempted replacement.

### Documentation

- Add project README/AGENTS navigation to both templates, using installed SDK
  guides/types and explicit build/browser verification boundaries.
- Route gameplay tasks to Core's quick guide (published in 2.5.5) and repository Star
  Catcher reference when available, with installed README/types as the fallback.
- Link installed UI 3.6.2's standard UI workflow and complete ScoreHUD example
  for directory/TS–Skin conventions, with fallbacks for older installations.
- Correct gallery instructions for its installed Core 2.5.4 and older CLI lock;
  source-engine trials remain optional maintenance tooling.

### Compatibility and adoption

- Command/configuration APIs, KUI format and runtime Skin output are unchanged.
  ui-document remains ^0.13.0, locked to registry 0.13.0; no Core/UI dependency
  or other dependency/lock update is added.
- To receive the declaration correction, update the project's
  CLI installation/lock and rebuild to regenerate .kurot/skin-parts.d.ts.
  Published 3.6.0 keeps the old property form. Core/UI runtime upgrades are not
  required for this fix; existing compatible application ranges remain valid.
- New scaffolds receive README/AGENTS entries. Existing games retain their own
  instructions, resources and directories. Template latest placeholders remain
  unchanged; UI 3.6.2 is needed only to read the new bundled UI guides.
- Kurot-Studio adopts exact registry CLI 3.6.1 with a matching lock in commit
  048e5c1. Its application build and complete check (175 files / 1,451 tests)
  pass; other direct/transitive dependencies and game installations are unchanged.
  The application has not been published.

### Verification

- Build and all 23 test files / 114 tests pass with maxWorkers=1, including
  compiler checks for four host discovery paths and rejected invalid part access.
  Serial execution avoids existing parallel watcher timing failures.
- Packed CLI 3.6.1 contains both templates' README/AGENTS entries and the fixed
  generator. Its game template and the packed UI 3.6.2 ScoreHUD example pass
  development/release builds and strict tsc --noEmit --skipLibCheck false against
  published Core 2.5.5 without engine source. Runtime browser behavior is not
  revalidated for this declaration/documentation patch.

## 3.6.0 — 2026-10-10

Published; verified on npm on 2026-10-10, including latest, package download
and registry integrity. Core 2.5.0 is also published; actual registry CLI
scaffolding resolves Core ^2.5.0.

### Changed

- Use symmetric neutral padding for default Button captions/icons and enable
  Panel title middle alignment. Keep the 2-pixel pressed offset. The supporting
  Core 2.5.0 centers single-line visible ink and retains stable input and
  multiline baselines; the source preview includes both changes.

- Replace the game template's EUI atlas with Kurot-owned rounded, blue KUI
  textures and XML skins, including selected/pressed/disabled states, shared
  text colors, resource-default nine-slice grids and a dedicated panel close
  button. Keep scroll bars hidden while retaining scrolling. Remove six unused
  container/text/image Skin placeholders; compose those nodes directly in XML.
  Existing projects retain their own resources. Add a native XML gallery to
  examples/game and reproducible private SVG-to-atlas tooling.
- Generate the KUI atlas at 2× (512×512, sheet `resolution: 2`) while preserving
  XML sizes and logical nine-slice grids. This template needs Core ^2.5.0;
  Core 2.5.0 was published before this CLI refresh.
  Provide an isolated source preview without modifying application registry locks.
- Refresh the game template's mascot logo and introduce a "Made with Kurot"
  brand splash with a playful entrance, looping hops and sways, repeating sparkles
  and a soft blue glow.
  Resource progress belongs to the game's Preloader; the HTML splash has no
  loading text or progress indicator and adds no minimum wait. Fit portrait and
  landscape viewports and stop animations under reduced motion. Existing project
  HTML is unchanged.

### Fixed

- Preserve engine and reusable component constructor names in development
  bundles as well as release bundles. Self-referencing classes such as Scroller
  otherwise become `_Scroller`, preventing conventional default Theme lookup.
- Omit empty runtime asset directory trees after filtering compiled KUI sources,
  rather than emitting an empty `resource/ui` hierarchy. Runtime files inside UI
  directories, generated theme JSON and template scaffold directories are preserved.
  No engine API, configuration, dependency or authored project migration is required.

### Compatibility

- CLI command/configuration APIs and KUI format remain unchanged. The ordinary
  dependency remains published ui-document ^0.13.0; CLI gains no Core/UI/Atlas
  dependency. Existing projects keep their own skins, resource keys and HTML.
- New game scaffolds require Core ^2.5.0 for the 2× skin kit. `create` resolves
  registry SDK versions; the template placeholders stay `latest`. Core was published
  before CLI. Install/rebuild projects that explicitly adopt the new skins.
- UI/Game/document/runtime/Atlas need no release. Adopting only the CLI build
  fixes requires updating the project's CLI installation/lock and rebuilding.

### Verification — 2026-10-10

- CLI build and all 112 unit tests pass against published document 0.13.0;
  Core 2.5.0 build and all 890 unit tests also pass.
- Package dry-run verifies the 3.6.0 manifest, default XML skins, 2× atlas,
  mascot logo, public documentation and release notes; the old EUI atlas is absent.
- The native isolated preview passed strict development/release builds with
  checkout Core and registry UI/Game/document. Original app locks remain unchanged.
- Published CLI 3.6.0 downloads through npm pack with matching registry integrity.
  Its archive contains all 16 XML skins, the 2× atlas, mascot logo and build fixes.
  Scaffolding with the published CLI generates Core ^2.5.0, UI ^3.4.0 and
  CLI ^3.6.0. Published Core 2.5.0 also downloads with matching integrity.

## 3.5.0 — 2026-10-09

Published; verified on npm on 2026-10-09.

### Added

Center flip attributes and state overrides now compile with strict boolean validation, including CLI-only controls. Nonvisual Skin roots reject flags. Requires ui-document ^0.13.0; games using flips require Core 2.4/UI 3.4.

See [centered flips](../../docs/centered-flips.md) for semantics and adoption.
Dependency installation and pnpm lock now resolve published ui-document 0.13.0
without local overrides; frozen installation reproduces the published dependency baseline.

### Verification

Frozen registry installation, build and all 102 unit tests pass against
published ui-document 0.13.0, including flags, states, percentages, malformed
booleans and nonvisual Skin-root rejection. The initial source trial had one
resource-watch timeout; its reruns and this full registry run pass.

## 3.4.0 — 2026-10-08

### Added

- Compile native BitmapLabel and independent RichLabel with published
  ui-document 0.12.0. Rich content uses literal `textFlow` / `Span` elements;
  named Skin states replace the whole flow, and an empty element clears it.
- Generate correctly typed BitmapLabel/RichLabel Skin parts. Text runs remain
  property data and never become display children or Skin parts.
- Validate new text-component properties and state values against their shared
  native contract before emitting a bundle; preserve the last good bundle and
  declarations when input is invalid.

### Fixed

- Keep percentage-looking text, labels and other string properties literal.
  Percentage conversion applies only to width and height.

### Dependencies and Compatibility

- Require published `@kurot/ui-document@^0.12.0`. The CLI has no Core/UI runtime
  dependencies. Applications using the new tags need UI `^3.3.0` and Core
  `^2.3.0`; Core 2.3.1 is recommended for corrected blank rich-text line metrics.
- Command/config APIs and document format version 2 remain unchanged. No forced
  asset migration or template/application upgrade. Legacy EXML projects stay
  on CLI 1.3.x. Native font sizes/presets belong to Label, not these new types.

### Tests

- Verify flow/state literals, bitmap fonts, unsupported fields, exact string
  content, generated part declarations, last-good output retention and existing
  templates. Verify packed generated factories against registry Core/UI.

## 3.3.1 — 2026-10-07

### Development Resource Updates

- Synchronize all runtime assets during dev, including locale configuration,
  atlas PNG/JSON, fonts and language properties, including Core-only projects.
- Reconcile deleted/renamed assets and reconnect after resource-root creation or
  replacement. Stage changed bytes before publication and preserve generated files.
- Coalesce and serialize resource updates; retain KUI rebuild requirements across
  mixed batches and retry failed compilation before publishing later resource edits.
- Emit resource-change build events and serve development files with no-store;
  browser refresh remains manual. No atlas parser or atomic group commit is added.

### Internal

- Add brief function and method comments and separate logical steps with blank
  lines throughout CLI source, without changing behavior in the cleanup.

### Dependencies and Compatibility

- Retain published `@kurot/ui-document@^0.11.0` and existing dependency ranges.
  Command/configuration APIs, KUI XML, stylesheet and document formats are unchanged.
- JSONL consumers must accept the additional `resource-change` build-start reason.
  Existing projects require no asset migration or special atlas directory.
- Updating installed CLI versions is required to receive the watcher fixes;
  a source-version bump alone does not confirm npm publication.

### Tests

- Exercise live dev processes and HTTP responses for binary/JSON assets, locale,
  translations, fonts, cache headers, rename/deletion, Core-only root creation,
  mixed style/resource batches and recovery after invalid styles.

## 3.3.0 — 2026-10-07

### Label Presets

- Expand shared Label presets from the optional fixed style.json before SkinIR
  generation. Emit only native Label properties; retain authored XML untouched.
- Rebuild all consuming skins when presets change. Invalid presets retain the
  previous successful bundle and recover after configuration correction.
- Add the optional `styleSheet` compilation option for programmatic KUI compilation.
- Preserve the precedence of state fields over local fields, preset fields and
  native defaults. Missing references and unsupported state preset selection fail
  explicitly rather than falling back silently.

### Dependencies and Compatibility

- Require published `@kurot/ui-document@^0.11.0` and remove the local pnpm override;
  installation and compilation use the registry kernel.
- Command/configuration APIs, style schemaVersion 1 and document format version 2
  remain unchanged. Existing skins receive no automatic migration. Core/UI do
  not need a new release for preset compilation; font loading belongs to the project.

### Tests

- Cover native property emission, local/state precedence, invalid references and
  shared preset changes across skins, including watcher failure and recovery.

## 3.2.1 — 2026-10-06

### Game Template

- Include fixed style.json and locale.json configuration, English properties,
  Chakra Petch regular/bold fonts and their SIL Open Font License.
- Load and publish project fonts before creating any UI, then register preload
  translations using the URL language or configured default with English/key fallback.
- Use shared ui-document font/color validation and named disabled text colors;
  default skins inherit the project font instead of hardcoded Tahoma.
- Keep the empty template minimal. Existing projects are not rewritten by scaffolding.
- Create resource/ui/app alongside the reusable component directories so the
  application Skin workspace is ready for the Editor.

### Dependencies and Compatibility

- New game projects include ui-document for the shared stylesheet parser. The
  compiler retains its existing ui-document ^0.10.0 dependency.
- Command/configuration APIs, KUI XML semantics and document format version 2
  remain unchanged. Existing projects receive no automatic migration.

### Tests

- Validate bundled fonts/licenses, stylesheet colors, translation registration,
  locale fallback, failed initialization and the unchanged empty template.
- Compile all bundled default skins with the project palette and verify newly
  generated projects through strict builds, type checking and browser rendering.

## 3.2.0 — 2026-10-06

### Added

- Read the optional fixed `resource/config/style.json` through the shared
  ui-document parser and resolve named colors in base properties and state
  overrides before SkinIR/code generation.
- Watch `config/style.json` during development. Rebuild skins when the palette
  changes, preserving the last successful Skin bundle on invalid configurations
  or missing referenced colors.

### Dependencies

- Require published `@kurot/ui-document@^0.10.0` for shared font/color validation,
  disposable color resolution and the `@style:colors:<key>` XML contract.
- Keep Node.js >= 20, ES2022/ESM output, command APIs and document format version 2
  unchanged. Core/UI remain application dependencies; no renderer upgrade is
  required for named colors.

### XML Authoring Change

- Compile `@style:colors:<key>` to numeric RGB values; preserve authored Skin XML.
  The previous `@token:color:<key>` prefix is rejected by the shared parser and
  requires an explicit source update. Files are not migrated automatically.
- Missing style.json is allowed until a Skin references a named color. Unsupported
  sections, invalid font/color configuration and unknown color keys fail explicitly.
  Schema-defined text remains literal; other semantic token syntax is unchanged.

### Tests

- Verify base/state color compilation, palette changes, black as zero, failures
  retaining the previous output and authored XML remaining untouched.

## 3.1.0 — 2026-10-05

### Added

- Compile shared-catalog Label textFit/minFontSize properties and state sizes
  unchanged. Drawing size remains a UI runtime derivation, never generated data.
- Include public documentation in the npm package, including the compilation
  contract, architecture and package context.

### Dependencies

- Require `@kurot/ui-document@^0.9.0` for the Label authoring catalog. KUI
  rendering with shrinking requires UI 3.1.x and Core 2.1.x or later within
  their respective majors; native engine packages remain project dependencies.
- Keep semantic format version 2, literal string handling and resource defaults.
  Existing EXML projects stay on CLI 1.3.x; no files are migrated automatically.

### Tests

- Verify fitting policy, minimum font size, authored size and state-size
  assignments through KUI parsing and code generation.

## 3.0.1 — 2026-10-04

### XML Authoring Change

- Require `@kurot/ui-document@^0.8.0`. Schema-defined string attributes,
  including `text`, `label` and state text, now compile as literal strings.
  `text="100.80"` preserves its decimal formatting; `text="false"` stays text.
  Old synthetic backslash type escapes are now literal characters and must be
  removed explicitly. No automatic source migration is performed.

### Changed

- Align the compiler dependency and lockfile with the published document kernel.
  Numeric/boolean properties, references, XML entities and schema-free collection
  scalar inference retain their existing rules. Generated Skin APIs are unchanged.

### Tests

- Verify literal text, state text, real backslashes and typed properties through
  parsing, code generation and the emitted theme bundle.

## 3.0.0 — 2026-10-03

### Breaking Changes

- KUI builds reject resource manifests with comma-separated sheet `subkeys`.
  Refresh each sheet in the Editor to produce an object-valued frame map before
  building with this CLI.

### Added

- Resolve resource nine-slice defaults into disposable Skin compilation copies.
  Explicit XML grids and `false` opt-outs take precedence; source states clear
  or replace inherited grids without changing authored XML.
- Development mode watches `resource/default.res.json`, serializes resource
  and component rebuilds, and retains the last good Skin bundle when manifest
  validation fails.

### Changed

- Require `@kurot/ui-document@^0.7.0` for the shared resource parser and
  default resolver.

### Tests

- Added parser, generated Skin, and development rebuild regressions.

## 2.0.2 — 2026-09-22

### Changed

- Raised the `@kurot/ui-document` requirement to `^0.6.2`.
- KUI compilation now treats `<Skin>` as the visual root container: Skin
  properties and layouts apply directly to the runtime Skin, and direct XML
  children become `skin.elementsContent` without generating an extra Group.
- Updated all bundled default skins to remove their redundant root Group.

## 2.0.1 — 2026-09-21

### Changed

- Raised the `@kurot/ui-document` requirement to `^0.6.1` for canonical Skin
  state and internal-node handling.
- Simplified the authored Skin root to `class`; storage IDs, format versions,
  runtime targets, and default flags are no longer user-edited XML metadata.
- Default theme mappings now come from internal built-in conventions and
  configured project component pairs.
- Skin parts are inferred from identified visual nodes; internal nodes can omit
  IDs. States use the root `states` list and local `property.state` attributes,
  so state-only targets do not require artificial part names.
- Image `source` values use plain resource keys without an
  `@resource:image:` prefix.

## 2.0.0 — 2026-09-21

This release is scoped to the Kurot Editor toolchain. Existing EXML game
projects remain supported by the 1.3.x line and are not expected to upgrade or
change their project configuration.

### Added

- Canonical KUI XML Skin compilation through `@kurot/ui-document`.
- Generated default theme mappings derived from Skin `target` and `default`
  metadata, including duplicate-default diagnostics.
- KUI XML project templates for all 21 built-in UI skins.

### Changed

- Replaced the `exml` project configuration with `ui.sourceDir`,
  `ui.namespaces`, and `ui.components`.
- Simplified SkinIR to the runtime operations produced by semantic KUI
  documents and removed syntax-specific compatibility branches.
- The theme JSON is generated at the fixed `resource/default.thm.json` output
  path rather than configured or supplied as an authored input.

### Removed

- EXML parsing, theme-input discovery, `.exml` templates, and compatibility
  diagnostics.

## 1.3.0 — 2026-09-20

### Added

- Generated declarations now narrow each exported project class's public
  `skinParts` accessor from an explicit string-literal `skinName`, a configured
  reusable-component pair, or a unique `<ClassName>Skin` naming match.
- Added ambiguity protection: convention inference is omitted when multiple
  compiled skins share the same short `<ClassName>Skin` name.

### Changed

- Project classes no longer need to repeat their skin as a base-class generic
  when the CLI can establish an unambiguous host-to-skin relationship.

### Tests

- Added regression coverage for explicit assignment, reusable-component,
  unique naming-convention, and ambiguous naming-convention host inference.

## 1.2.0 — 2026-09-20

### Added

- EXML compilation now generates `.kurot/skin-parts.d.ts`, augmenting
  `@kurot/ui`'s `SkinPartsMap` with the exact named parts and component types
  for every compiled skin.
- Generated declarations resolve convention-based and manually configured
  namespace components back to their project TypeScript modules.

### Changed

- New project TypeScript configurations include `.kurot/**/*.d.ts` so typed
  skin parts are available to editors and `tsc` without entering runtime
  bundles.
- New projects ignore the generated `.kurot` directory together with build and
  dependency output.
- Updated custom-component guidance for the atomic skin lifecycle introduced by
  `@kurot/ui@2.0.0`.

### Tests

- Added regression coverage for built-in and project-component skin-part
  declarations and for the generated-project TypeScript and ignore settings.

## 1.1.4 — 2026-09-09

### Changed

- New game projects now place the default EUI atlas at
  `resource/assets/ui/eui/eui.json` and
  `resource/assets/ui/eui/eui.png`.
- The generated `default.res.json` now references the atlas through its new
  `assets/ui/eui/eui.json` path.

### Tests

- Added template regression coverage for the nested EUI atlas layout and the
  absence of legacy copies under `resource/assets/`.

## 1.1.3 — 2026-08-30

### Fixed

- EXML string attributes now decode Egret-style `\n` sequences as hard line
  breaks instead of rendering the backslash and `n` literally.

## 1.1.2 — 2026-08-30

### Added

- Convention-based reusable components through `exml.components`, pairing
  `src/components/<Name>.ts` with
  `resource/skins/components/<Name>Skin.exml` while keeping standard EUI Skin
  files editable in existing visual tooling.
- Automatic `#ns/<prefix>` namespace entries, Theme mappings, exact EXML tag
  validation with spelling suggestions, and a development-only
  `.kurot/component-catalog.json` for future editor and agent tooling.
- Component-aware development watching for TypeScript/Skin additions,
  removals, renames, and edits.

### Changed

- New game projects no longer scaffold or require `src/game-components.ts`.
  Manual `exml.namespaces` barrels remain supported for advanced use.
- Default EUI skins in new game projects are grouped under
  `resource/skins/eui`, keeping them separate from reusable component skins.

### Fixed

- Release bundles now preserve component constructor names required by the
  Theme default-Skin lookup contract.

### Tests

- Added coverage for component discovery, pairing validation, generated
  namespaces, Theme mappings, development catalogs, release name preservation,
  watched component additions, and the updated game template layout.

## 1.1.0 — 2026-08-13

### Added

- Project-owned HTML templates through `html.template`, with explicit placeholders for the import map, entry script, and stage settings.
- Editable `template/web/index.html` files in both the `game` and `empty` project templates.
- A serializable diagnostic model shared by build plugins, with stable codes,
  severity, optional source locations and repair suggestions. Diagnostics are
  deduplicated and sorted deterministically for reliable Agent consumption.
- Source ranges for EXML elements and attributes, including accurate 1-based
  line and column reporting for unknown component tags across LF and CRLF files.
- Similar-name suggestions for unknown built-in EXML tags, such as
  `eui:Buton` → `eui:Button`.
- `--strict` support for `kurot build` and `kurot dev`. Strict policy promotes
  supported recoverable warnings to errors; release builds enable it by default.
- `kurot build --diagnostics json`, which reserves stdout for one structured
  build result containing success state, mode, duration, output directory and
  diagnostics.
- `kurot dev --diagnostics jsonl`, which reserves stdout for independent
  `build-start`, `diagnostic`, `build-complete` and `server-ready` events.
- Stable diagnostics for the following cases:
    - `KUROT_EXML_UNKNOWN_TAG`
    - `KUROT_EXML_COMPILE_FAILED`
    - `KUROT_EXML_DECLARED_FILE_NOT_FOUND`
    - `KUROT_THEME_FILE_NOT_FOUND`
    - `KUROT_THEME_INVALID_JSON`
    - `KUROT_THEME_SKIN_NOT_FOUND`
    - `KUROT_WATCH_RELEASE_IGNORED`

### Changed

- The default page centers the game canvas horizontally and vertically.
- Development builds clear the previous output before compiling and place shared application chunks under `js/chunks/`.
- Unknown EXML tags remain warnings in normal development builds, but strict
  and release builds now stop after reporting them with their source location.
- A missing theme, invalid theme JSON, an absent explicitly declared EXML file,
  and a theme Skin path that was not compiled are now reported as distinct
  conditions instead of being silently collapsed into an empty theme.
- Invalid theme JSON and genuine Skin compilation failures stop every build.
  Missing inputs that remain recoverable in normal mode emit explicit warnings.
- Machine-readable modes suppress colored human logs, keeping stdout free of
  ANSI escapes and unstructured text. Failed commands set a non-zero exit code.

### Fixed

- Development EXML failures no longer generate empty Skin factories returning
  `{}` and therefore can no longer masquerade as successful compilation.
- EXML watch rebuilds stage the complete Skin bundle before installation. A
  failed rebuild keeps the last successful bundle and dev server alive; fixing
  the EXML source allows the next rebuild to recover normally.
- Theme `skins` mappings are checked against the actual compiled EXML set, while
  avoiding duplicate diagnostics when the same path was already reported as a
  missing explicit declaration.

### Tests

- Added parser and collector coverage for source locations, strict promotion,
  sorting, deduplication and JSON serialization.
- Added real CLI process coverage for human output, JSON build success/failure,
  strict unknown-tag failures, malformed EXML, theme errors, JSONL dev startup,
  and failed-watch recovery.
- Verified that a structured unknown-tag suggestion can be applied and followed
  by a successful strict build with zero diagnostics.

## 1.0.0 — 2026-08-06

### Added

- **`scale9Grid` attribute compiled to `new Rectangle()`** — EXML attributes like `scale9Grid="1,3,8,8"` are now compiled to `new Rectangle(1, 3, 8, 8)` instead of being passed as a raw string. Core `Rectangle` is automatically imported when a skin contains any `scale9Grid` property.
- **Lowercase property-node shorthand** — `<eui:layout><eui:HorizontalLayout/></eui:layout>` is now accepted as a shorthand for the Egret-qualified `<eui:Group.layout>` tag, bringing EXML parsing closer to Egret's original behaviour.
- **Game template: resource-aware asset adapter** — `Main.ts` now installs a custom `AssetAdapter` that resolves EXML `source` strings through `resource.get<Texture>()` first (supports preloaded atlases and sprite sheets), falling back to the default URL-based `ImageLoader`.

### Changed

- **Updated all game-template skins** — Button, CheckBox, HScrollBar, HSlider, ItemRenderer, Panel, ProgressBar, RadioButton, TextInput, ToggleSwitch, VScrollBar, and VSlider skins modernised with consistent constraints, state names, and sizing conventions matching Egret EUI defaults.
- Release builds now fail on invalid EXML instead of silently publishing an empty skin stub; development builds continue with a warning for faster iteration.

### Tests

- `test/exml-parser.test.ts`: 2 new cases (scale9Grid Rectangle compilation, lowercase property-node shorthand).

---

## 0.7.2 — 2026-08-06

### Changed

- **TextInputSkin**: `textDisplay` and `promptDisplay` now use `left="10"` / `right="10"` constraints so their layout bounds match the input background and native StageText overlay.
- Updated the game-template documentation to describe its current `UILayer` / `createChildren()` lifecycle and the recommended custom-component initialization hooks.
- Release builds now fail on invalid EXML instead of silently publishing an empty skin stub; development builds continue with a warning for faster iteration.

## 0.7.1 — 2026-08-06

### Changed

- **HSliderSkin / VSliderSkin**: tracks now use `width="100%"` / `height="100%"` instead of inset `left`/`right` / `top`/`bottom` constraints, aligning with the `@kurot/ui` 1.1.0 fix that positions the thumb relative to the track's layout bounds.
- **TextInputSkin**: `textDisplay` and `promptDisplay` use a fixed height with `verticalCenter`; `promptDisplay` sets `multiline="false"` / `wordWrap="false"` to prevent accidental wrapping of placeholder text.

## 0.7.0 - 2026-08-06

### Added

- Support for root `Skin` properties such as `minWidth` and `minHeight` during EXML compilation.
- Support for shorthand `states="up,down,disabled"` declarations and root state-specific properties.
- Support for `excludeFrom` as well as `includeIn` when generating state overrides.
- Parser and code-generation coverage for every EXML skin included in the game template.

### Changed

- Updated the default game-template skins to follow Egret EUI state and sizing conventions more closely.
- Made control, container, slider, and scrollbar skins responsive through constraints and minimum dimensions.

## 0.6.1 - 2026-07-16

### Added

- Support for project-defined EXML namespace prefixes through `exml.namespaces`.
- Shared namespace chunks so classes referenced by both game code and EXML retain the same module identity.

## 0.6.0 - 2026-06-08

### Changed

- Compiled all EXML skins into a bundled ESM theme module loaded dynamically by the runtime.
- Stopped shipping source `.exml` files in release output.

## 0.5.1 - 2026-06-07

### Changed

- Added npm publishing configuration and package metadata updates.

## 0.5.0 - 2026-06-07

### Added

- Split Kurot engine packages into independent browser chunks.
- Generated import maps and manifests to connect application, engine, and theme modules without duplication.

## 0.4.0 - 2026-06-06

### Changed

- Reworked the build system around an extensible plugin pipeline.

## 0.3.11 - 2026-05-08

### Changed

- Switched release builds to two-pass bundling with content-hashed filenames.

## 0.3.0 - 2026-05-07

### Added

- Bundled development builds and EXML code generation.
- Game and empty project templates with local CLI scripts.

### Changed

- Moved default skins and resource configuration into the game template.

## 0.2.0 - 2026-05-05

### Added

- Built-in EXML parsing, code generation, view states, watch mode, and bundle analysis.

## 0.1.0 - 2026-05-01

### Added

- Initial `@kurot/cli` release with project creation, HTML5 builds, development server, and cleaning commands.
