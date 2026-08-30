# Changelog

All notable changes to `@kurot/ui-runtime` are documented here.

---

## [0.2.0] — 2026-08-30

### Added

- Format-v2 project asset materialization through `UIAssetRegistry`.
- Reusable component expansion with parameter bindings, selected variants,
  public-part overrides, and projected Slot content.
- Design-token resolution and an explicit resource-resolution hook.
- Appearance assets materialized as native Kurot `Skin` and `State` objects.
- Collision-free slash-qualified lookup keys for reusable component internals.
- A format-v2 browser preview with two instances of one reusable component.

### Changed

- Upgraded the `@kurot/ui-document` contract to `^0.3.0`.
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
