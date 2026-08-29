# Changelog

All notable changes to `@kurot/cli` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

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
