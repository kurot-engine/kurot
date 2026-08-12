# Changelog

All notable changes to `@kurot/cli` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Project-owned HTML templates through `html.template`, with explicit placeholders for the import map, entry script, and stage settings.
- Editable `template/web/index.html` files in both the `game` and `empty` project templates.

### Changed

- The default page centers the game canvas horizontally and vertically.
- Development builds clear the previous output before compiling and place shared application chunks under `js/chunks/`.

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
