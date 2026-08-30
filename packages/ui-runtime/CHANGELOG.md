# Changelog

All notable changes to `@kurot/ui-runtime` are documented here.

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
