# Changelog

All notable changes to `@kurot/ui-runtime` are documented here.

---

## 0.10.0 — 2026-10-09

Published; verified on npm on 2026-10-09.

### Added

Native center flip flags support materialization, typed bindings and state restoration. Requires Core ^2.4.0, UI ^3.4.0 and ui-document ^0.13.0 for their implemented contracts.

See [centered flips](../../docs/centered-flips.md) for semantics and adoption.
Development installation and pnpm lock now resolve published Core 2.4.0,
UI 3.4.0 and ui-document 0.13.0 without local overrides. UI and runtime share
one Core instance, including its native display classes.

### Verification

Frozen registry installation, build and all 76 unit tests pass against published
Core 2.4.0/UI 3.4.0/document 0.13.0, including native materialization, state
restoration and atomic rejection of invalid typed bindings. Dependency inspection
confirms UI and runtime resolve one shared Core.

## [0.9.0] — 2026-10-08

### Added

- Materialize native BitmapLabel and RichLabel through explicit factories and
  property handlers. Both retain native automatic size and text layout;
  RichLabel uses literal textFlow runs without Label's plain-text/preset API.
- Resolve typed bitmap-font references through the existing font adapter. The
  default returns the Core resource key; an override may return a BitmapFont.
  The runtime does not take ownership of fonts or their page textures.
- Support whole-flow state overrides, explicit empty flows and transactional
  data bindings. Restoration uses native owned copies, including absent base
  content and initially undefined bitmap fonts.

### Dependencies and Migration

- Require published Core `^2.3.0`, UI `^3.3.0` and ui-document `^0.12.0` together.
  Development tests use registry Core 2.3.1; its patch fixes unstyled blank
  rich-text line metrics without raising the required Core API minimum.
- Public materialization/controller APIs and document format version 2 remain
  unchanged. Existing runtime 0.8.2 apps can retain their current controls and
  locks; adopting the new text types requires this runtime and matching peers.
- No auto-migration, font I/O, project stylesheet expansion or Stage ownership
  is added. Label presets apply only to Label and its actual subclasses.

### Tests

- Verify independent native classes, literal content, automatic dimensions,
  font adapters and ownership, invalid values, native/reusable states, clearing,
  rollback after adapter failure and typed flow data bindings.
- Verify packed output on the minimum supported Core and the current patch.

## [0.8.2] — 2026-10-07

### Changed

- Adopt published `@kurot/ui-document@^0.11.0` in peer and development
  dependencies so Editor and CLI 3.3.0 share the Label preset contract.
- Keep materialization APIs, state restoration and disposal unchanged. Callers
  expand `style.json.labels` into disposable documents before resolving colors
  and materializing every root or registered appearance; the runtime does not
  read style.json, load fonts or apply presets to authoring data.

### Migration

- Upgrade ui-document to `^0.11.0` together with this runtime. Earlier runtime
  0.8.1's peer range excludes this kernel. Core `^2.1.0`, UI `^3.1.0`, style
  schemaVersion 1 and document format version 2 remain unchanged.
- Preserve authored XML and history references. Named states override individual
  properties; selecting a Label preset remains Default-only.

### Tests

- Verify preset-derived native fields, local/state precedence and restoration,
  font aliases, black colors and authored-document preservation through the
  published kernel.

## [0.8.1] — 2026-10-06

### Changed

- Adopt published `@kurot/ui-document@^0.10.0` in peer and development
  dependencies, including its shared project font/color configuration and
  `@style:colors:<key>` XML color references.
- Keep runtime APIs, materialization, native state restoration and disposal
  unchanged. Applications resolve stylesheet colors in disposable document
  copies or register their numeric values as color design tokens; the runtime
  does not read style.json or load fonts.

### Migration

- Upgrade the application or Editor's ui-document dependency to `^0.10.0`
  together with this runtime. The previous `@token:color:<key>` XML syntax is
  rejected by the new document parser; update authored references explicitly.
  Literal text, internal color-token records and semantic format version 2
  remain unchanged. Core `^2.1.0` and UI `^3.1.0` remain the peer requirements.

### Tests

- Verify stylesheet-derived base and inactive-state colors, black RGB values,
  native state restoration, registry token resolution, literal reference-like
  text, and preservation of authored XML through the published document kernel.

## [0.8.0] — 2026-10-05

### Added

- Apply Label textFit and minFontSize through native UI property routing so
  editor previews share compiled-skin behavior without changing authored size.
- Include public documentation in the npm package, including text layout,
  materialization boundaries and package context.

### Breaking

- Require `@kurot/core@^2.1.0`, `@kurot/ui@^3.1.0`, and
  `@kurot/ui-document@^0.9.0` in peer and development dependencies. Upgrade
  these libraries together; semantic format version 2 and literal XML strings
  remain unchanged.
- Explicit `multiline: false` now uses Core's single-line behavior even when
  height is automatic. Remove the flag or use `true` when wrapping is intended.

### Tests

- Verify shrinking without document mutation, restoration after shorter text,
  constructor defaults, native appearance state sizes and invalid authoring
  values against the published dependency versions.

## [0.7.0] — 2026-10-04

### Breaking

- Require `@kurot/ui-document@^0.8.0` in peer and development dependencies.
  Callers parsing KUI XML adopt literal string attributes: numeric-looking and
  boolean-looking text no longer needs a backslash type escape. Previous
  synthetic prefixes become literal characters; remove them explicitly.

### Changed

- Align the development lockfile with the published document kernel. Runtime
  APIs, materialization, state restoration and disposal are unchanged; Core 2.x
  and UI 3.x remain the required engine versions.

### Tests

- Verify XML-parsed literal strings materialize exactly into native Labels,
  including native appearance state changes and restoration.

## [0.6.0] — 2026-10-03

### Added

- UI Images and native appearance states consume resource-derived nine-slice
  grids after callers resolve defaults with `@kurot/ui-document@^0.7.0`.
- `scale9Grid: false` clears an inherited grid during a state change; leaving
  the state restores the previous grid. Native state rectangles become
  `Rectangle` instances before assignment.

### Breaking

- Require `@kurot/core@^2.0.0`, `@kurot/ui@^3.0.0`, and
  `@kurot/ui-document@^0.7.0` in peer and development dependencies.
  Applications must upgrade these packages together and refresh legacy
  sheet manifests in Kurot Editor before loading resources.

### Tests

- Added regressions for local overrides, opt-out, state restoration, and
  direct runtime property updates.

## [0.5.6] — 2026-09-23

### Fixed

- Native appearance states can now update anonymous Skin children. Synthetic
  node IDs remain absent from public `skinParts` while staying available to
  internal state overrides such as `source.down`.

## [0.5.5] — 2026-09-23

### Fixed

- Skin size-limit metadata now resolves number and spacing design-token
  references through the project registry.
- State and variant overrides targeting the synthetic Skin root now apply to
  the native Skin instance instead of being silently skipped.

## [0.5.4] — 2026-09-22

### Fixed

- Semantic appearance materialization now treats the Skin root Group as
  authoring metadata instead of a rendered wrapper, matching CLI-generated
  skins. Direct skin children consequently size and position against the host
  component rather than the Skin root's minimum dimensions.
- Skin width, height, and minimum/maximum size metadata are now transferred to
  the native Skin instance.

## [0.5.3] — 2026-09-22

### Fixed

- Authored appearance node IDs now remain available as native Skin parts when
  the semantic contract has no explicit part aliases. Controls such as Button
  can therefore bind `labelDisplay` and `iconDisplay` from canonical Skin XML.

## [0.5.2] — 2026-09-22

### Added

- Added built-in property routing for authored `skinName` values so skinnable
  controls can resolve generated KUI Skin factories.

### Changed

- Raised the `@kurot/ui-document` peer and development dependency to `^0.6.4`
  for the catalog-defined `skinName` contract.

## [0.5.1] — 2026-09-21

### Changed

- Updated the document peer and development dependency to
  `@kurot/ui-document@^0.6.0` and revalidated runtime materialization with
  canonical KUI XML fixtures.

---

## [0.5.0] — 2026-09-20

### Changed

- Upgraded the runtime and development contract to `@kurot/ui@^2.0.0`.
- Appearance materialization now runs against UI 2.0's atomic complete-skin
  lifecycle while retaining the existing `Skin.setPart()` authoring boundary.

### Tests

- Revalidated native Button, ProgressBar, and TextInput appearance-part binding,
  state handling, transitions, data bindings, and disposal against UI 2.0.

## [0.4.2] — 2026-08-31

### Changed

- Split child attachment, authored-property application, and scoped node
  identity into focused kebab-case runtime modules without changing
  materialization behavior.
- Updated development dependencies to `@kurot/ui@1.1.9` and
  `@kurot/ui-document@0.5.1` while retaining the existing compatible peer
  dependency ranges.

---

## [0.4.1] — 2026-08-31

### Added

- `invalid-adapter` configuration errors when `captureProperty` and
  `restoreProperty` are not supplied together.
- Regression coverage for mixed built-in and adapter-owned state properties,
  repeated transactional assignments, and adapter configuration validation.

### Changed

- Transactional property updates now preserve the owning layer of each
  property: built-in properties restore reflectively, while adapter-owned
  properties restore through their paired adapter hooks.
- Reusable component states and data bindings share the same atomic property
  transaction implementation, including reverse rollback and recovery causes.
- Runtime diagnostics use canonical asset paths and structured runtime errors
  for impossible materialization states.
- Semantic action and transition routing retain exhaustive union handling
  instead of silently selecting fallback behavior.

---

## [0.4.0] — 2026-08-31

### Added

- Optional component-adapter property snapshot and restoration hooks for
  transactional data bindings backed by non-reflective state.
- Regression coverage for required initial data, failed multi-target binding
  rollback, and non-zero native appearance transitions.

### Changed

- Upgraded the `@kurot/ui-document` contract to `^0.5.0`, enabling component
  capability validation for semantic events, appearance states, and skin
  parts before materialization.
- Required Contract data fields must now have an explicit initial value or a
  Schema default.
- Data controllers commit a new value only after every binding succeeds. A
  failed target restores earlier targets in reverse order and leaves the
  controller value unchanged.
- Split dynamic Contract and appearance-transition integration tests out of
  the general materialization suite.
- Corrected Button transition fixtures to use the native `down` state instead
  of the non-existent `pressed` state.

## [0.3.0] — 2026-08-31

### Added

- Runtime execution for typed Contract data fields and deterministic one-way
  property bindings, including initial values and later controller updates.
- Disposable semantic `tap` and `change` actions with document asset, scope,
  and source-node identity.
- Numeric appearance-state transitions with bounded duration, delay, and
  easing semantics.
- Category-specific resource adapters for image, sprite-frame, font, Spine,
  and animation references, with stable resource-key defaults.
- A representative Crash-game screen test covering live data, actions,
  resource resolution, controls, and appearance transitions.

### Changed

- Upgraded the `@kurot/ui-document` contract to `^0.4.1`.
- Split dynamic contracts, resource dispatch, and transitions into focused
  runtime modules.

## [0.2.3] — 2026-08-31

### Added

- Built-in materialization for `kui.TextInput` and its low-level
  `kui.EditableText` appearance part.
- Strict runtime routing for text, prompt, color, password display, character
  limits, restrictions, and the current plain-text input type.
- Integration coverage for cached TextInput property forwarding, native skin
  part binding, prompt state transitions, and touch-to-focus behavior.
- An interactive browser preview that verifies placeholder rendering, native
  text entry, input event updates, and coexistence with existing controls.

### Changed

- Upgraded the `@kurot/ui-document` contract to `^0.3.5`.
- Aligned runtime property handlers with the semantic Schema hierarchy and
  removed unreachable legacy `currentState`, `skinName`, and
  `hostComponentKey` property routes.

## [0.2.2] — 2026-08-31

### Added

- Built-in materialization for `kui.ToggleButton` and `kui.ProgressBar`.
- Runtime property routing for progress range values, fill direction, and
  slide duration.
- Integration coverage for ToggleButton label-part binding and ProgressBar
  thumb clipping and label updates through native appearance parts.
- Browser preview examples for both newly supported controls.

### Changed

- Upgraded the `@kurot/ui-document` contract to `^0.3.3`.

## [0.2.1] — 2026-08-30

### Added

- Selected appearance variants are applied as deterministic base-skin
  overrides before native state overrides.
- The browser preview and integration suite cover appearance-variant selection
  and invalid variant references.

### Changed

- Upgraded the `@kurot/ui-document` contract to `^0.3.2`.

## [0.2.0] — 2026-08-30

### Added

- Project asset materialization through `UIAssetRegistry`.
- Reusable component expansion with parameter bindings, selected variants,
  public-part overrides, and projected Slot content.
- Design-token resolution and an explicit resource-resolution hook.
- Appearance assets materialized as native Kurot `Skin` and `State` objects.
- Collision-free slash-qualified lookup keys for reusable component internals.
- A browser preview covering reusable components.
- Per-instance reusable-component state controllers with atomic activation,
  exact pre-state restoration, and structured unknown-state errors.

### Changed

- Project-wide asset and component validation now runs before materialization.
- The test suite now has an explicit Node/Vitest TypeScript project and performs
  test type-checking before execution.

## [0.1.0] — 2026-08-30

### Added

- Initial package scaffold and runtime boundary documentation.
- Deterministic `UIDocument` validation and recursive component-tree materialization.
- Built-in factories for `kui.Group`, `kui.Label`, `kui.Image`, `kui.Rect`, and
  `kui.Button`.
- Strict inherited and component-specific property application, including
  layouts and nine-slice rectangles.
- Custom component adapters and stable node-ID-to-instance lookup.
- Structured runtime errors with semantic document paths and validation diagnostics.
- Browser preview and real-object runtime tests.
