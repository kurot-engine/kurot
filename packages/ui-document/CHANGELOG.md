# Changelog

All notable changes to `@kurot/ui-document` are documented here.

---

## [0.3.3] — 2026-08-31

### Added

- Audited `kui.ToggleButton` Schema inheriting the complete `kui.Button`
  contract while overriding the `toggle` default to match runtime behavior.
- Audited `kui.ProgressBar` Schema for its numeric range, fill direction, and
  slide-duration properties.
- Catalog validation coverage for both newly supported controls.

## [0.3.2] — 2026-08-30

### Added

- `UIAppearanceReference` and `createUIAppearanceReference()` for selecting an
  appearance asset with an optional published variant.
- Structural, serialization, and project validation for appearance variant
  selections, including exact `unknown-variant` diagnostics.
- Golden fixtures covering a valid compact appearance variant.

### Changed

- Separated contextual appearance selections from generic property asset
  references while sharing their stable asset-identity fields.
- Tightened semantic reference matching so malformed or context-specific
  references cannot satisfy ordinary object and generic reference schemas.
- Enabled stricter source and test compilation for exact optional properties,
  unchecked indexed access, unused declarations, implicit returns, overrides,
  and switch fallthrough.

## [0.3.1] — 2026-08-30

### Changed

- Added an explicit Node/Vitest TypeScript project for the test suite and made
  `pnpm test` type-check test sources before executing them.
- Kept fixture loading on standard `node:fs` and `node:url` APIs with an
  explicit Node type boundary.

## [0.3.0] — 2026-08-30

### Added

- Semantic operations for node insertion, removal, movement, type replacement,
  properties, appearances, reusable instances, parameters, variants, Part
  overrides, and public Contract entries.
- Exact inverse generation for every successful operation.
- Atomic transactions with caller identities, intent summaries, expected
  revisions, final validation, inverse transactions, and deterministic change
  summaries.
- Monotonically increasing revisions and explicit stale-transaction conflict
  errors for delayed editor or Agent work.
- `UIDocumentHistory` with undo, redo, branch clearing, and revisions that
  continue increasing across history navigation.
- Deterministic semantic document diffs suitable for review interfaces.
- Explicit parameter bindings from reusable component parameters to internal
  node properties, enabling runtime-neutral component inputs without embedded
  expressions.

### Changed

- Tree operations and diffs treat ordinary children and Slot-projected children
  as first-class ordered collections.
- Single-operation edits validate immediately, while transactions validate the
  final snapshot atomically so coordinated operations may temporarily cross an
  invalid intermediate state.
- Project validation checks parameter binding destinations and their target
  component properties.

## [0.2.0] — 2026-08-30

### Added

- Format version 2 with explicit `screen`, `component`, and `appearance`
  asset kinds and runtime-neutral public asset contracts.
- Reusable component instances with stable asset references, typed parameters,
  variants, public-part overrides, and named Slot projection without copying
  component internals into parent documents.
- Public parts, Slot definitions, states, variants, and deterministic property
  overrides addressed through stable node identifiers.
- Typed project resource and design-token references, including accepted
  resource and token categories in component property schemas.
- `UIAssetRegistry` for deterministic project asset, resource, and design-token
  lookup.
- Cross-document validation for component and appearance compatibility,
  parameters, variants, parts, Slots, missing project references, type
  mismatches, override property schemas, duplicate component identities, and
  dependency cycles.
- Golden conformance fixtures covering a reusable component, an appearance,
  and a screen containing two compact component instances.

### Changed

- Canonical serialization now normalizes asset contracts, instances, reference
  records, and property definitions in addition to recursive property values.
- Tree queries and component-aware validation include children projected into
  instance Slots.
- The foundation catalog uses typed resource references for image sources and
  icons, and accepts typed design tokens for audited color and layout values.
- Compatibility-shaped `currentState`, `skinName`, and `hostComponentKey`
  fields were removed from the canonical Kurot authoring catalog. States and
  appearances are represented directly by the semantic model.

### Breaking

- `UIDocument` now requires `assetKind` and `contract`; nodes may additionally
  contain `instance` and `appearance`.
- `UI_DOCUMENT_FORMAT_VERSION` is now `2`. Version 1 input is rejected rather
  than silently reinterpreted; no migration is provided because 0.1 was an
  unpublished authoring foundation rather than a production file format.

## [0.1.0] — 2026-08-30

### Added

- Initial independent package scaffold with strict TypeScript, ESM, build,
  test, publishing metadata, and public documentation.
- Initial `UIDocument`, `UINode`, and recursive `UIPropertyValue` semantic
  model with explicit constructors.
- Deterministic tree traversal, node lookup, strict validation, structured
  diagnostics, and validated JSON parsing/serialization.
- Generic component/property definitions, deterministic component registry,
  and optional registry-aware document validation. Definitions may explicitly
  remain open while concrete component properties are reviewed incrementally.
- Abstract component definitions and single-parent schema inheritance with
  deterministic base-to-derived resolution, property overrides, cache
  invalidation, missing-base/cycle errors, and abstract-node diagnostics.
- Initial audited Kurot UI foundation catalog with three abstract semantic
  bases and concrete `Group`, `Label`, `Image`, `Rect`, and `Button` nodes.
  Their serializable authoring properties are inherited and strictly validated;
  runtime-only objects are deliberately excluded.
- Kurot-owned `kui.*` component identities; legacy EUI names are reserved for
  future EXML adapter boundaries rather than stored in semantic documents.
- Property schemas with union value types, enum values, numeric ranges, integer
  constraints, serializable defaults, and editor-facing semantic formats.
- `UI_DOCUMENT_KIND` and `UI_DOCUMENT_FORMAT_VERSION` as explicit format
  boundaries.
