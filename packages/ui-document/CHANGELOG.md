# Changelog

All notable changes to `@kurot/ui-document` are documented here.

---

## [0.13.1] — 2026-10-10

Published; package download, registry integrity and tested catalog modules verified on 2026-10-10.

### Changed

- Report middle as the verticalAlign default for Label, EditableText, RichLabel
  and BitmapLabel, matching published Core 2.5.3 and inherited UI text behavior.
- Preserve omitted XML properties, explicit top/bottom and named-state overrides
  in both line modes. Multiline only controls line generation; format 2, public
  APIs, validation and the headless dependency boundary are unchanged.

### Compatibility

Editors adopt Core 2.5.3 and this catalog together. CLI 3.6.0
and runtime 0.10.0 accept 0.13.1 through their existing ^0.13.0 ranges; no new
SDK versions or higher minima are needed. This metadata does not change an older
installed Core's runtime default or rewrite project XML.

### Verification

Build and all 227 unit tests pass (19 files), including all four component
defaults, omission, explicit top/bottom, state round trips and both line modes.
Package dry-run verifies version 0.13.1, all 319 files, declarations, public docs
and the four compiled catalog defaults. `git diff --check` passes.

## [0.13.0] — 2026-10-09

Published; verified on npm on 2026-10-09. Consumers on ^0.12.0 must
explicitly adopt ^0.13.0 to use the new authoring metadata.

### Added

Added inherited boolean flipX/flipY metadata with false defaults for every display node. XML/state serialization and history retain literal flags without converting negative scale. Format version 2 and headless dependencies are unchanged.

See [centered flips](../../docs/centered-flips.md) for semantics, adoption and
consumer verification. CLI 3.5.0 and ui-runtime 0.10.0 development now install
the published kernel with matching registry locks and no local override.

### Verification

Build and all 223 unit tests pass, including shared defaults, XML and state
round trips, boolean validation and transactional undo/redo.

## [0.12.0] — 2026-10-08

### Added

- Add independent BitmapLabel and RichLabel foundation definitions, matching
  published UI 3.3.0 without importing engine packages into the headless kernel.
- Type BitmapLabel.font as a font resource; retain literal text and native
  alignment, spacing, multiline and smoothing contracts.
- Add UITextFlow, UITextRun, UITextRunStyle and isUITextFlow with strict per-run
  font, size, emphasis, RGB colors and outline validation.
- Serialize rich-text data as textFlow/Span property elements, including
  whole-flow Skin state overrides and explicit empty content. Retain run order,
  hard line breaks, tabs, spaces, XML entities and literal backslashes.
- Add the text-flow property format and reject unconstrained array bindings to it.

### Fixed

- Keep typed resource keys that look like boolean or numeric scalars as resource
  identities, rather than interpreting their names as primitive values.

### Compatibility

- Keep document format 2 and existing Label presets unchanged. No project migration
  or native Core/UI release is required for this headless addition.
- Consumers on ^0.11.0 must explicitly adopt ^0.12.0. CLI and ui-runtime need
  built-in code generation/materialization support before Editor integration.
- UIPropertyFormat includes text-flow; exhaustive consumers need a matching branch.
  Remove duplicate private BitmapLabel definitions when adopting the foundation catalog.

## [0.11.0] — 2026-10-07

### Added

- Parse optional `style.json.labels` into immutable, validated Label presets covering
  font family, size, colors, outline, emphasis, alignment and line spacing.
- Resolve `@style:fonts:<role>` and `@style:colors:<key>` inside presets. Add
  `getUILabelStyle`, `resolveUILabelStyles` and typed preset metadata.
- Retain `textStyle="@style:labels:<key>"` in authored XML/history; expand only
  compilation/preview copies. Local properties and individual state overrides win.
- Bind presets in Default only. Reject non-Label, state/variant, instance override
  and dynamic binding usage rather than silently emitting unsupported properties.

### Changed

- Preserve document format 2 and stylesheet schemaVersion 1. Existing projects
  receive no automatic preset insertion.

### Breaking

- Require the `labels` map in the exported `UIStyleSheet` type; the parser
  supplies an empty map when the JSON section is absent.
- Consumer dependency ranges on `^0.10.0` exclude this release.

## [0.10.0] — 2026-10-06

### Added

- Share the `style.json` font and named RGB palette contract through
  `parseUIStyleSheet`, `getUIStyleFontAlias`, `getUIStyleFontFamily` and
  `getUIStyleColor`, with field-specific validation errors and immutable colors.
- Resolve color references in a disposable compilation/preview copy through
  `resolveUIStyleColors`, including nested property values and inactive states
  and variants. Preserve authored documents, XML and history; missing colors
  fail with their semantic property path.

### Changed

- Serialize named colors as `@style:colors:<key>` in default and state attributes,
  matching the `colors` section of project `style.json`.
- Keep the internal color-token model, document format version 2 and style
  schemaVersion 1 unchanged. This package performs no I/O, font loading or rendering.

### Breaking

- Reject the previous `@token:color:<key>` XML prefix; explicitly update authored
  color references before adopting 0.10.0. No automatic file migration is provided.
- Reject unsupported stylesheet sections and empty reference keys. Literal
  string properties and other semantic token categories retain their contracts.
- Consumers using `^0.9.0` must update their dependency or peer range to adopt
  this release. See [project styles](docs/project-styles.md) for integration.

## [0.9.0] — 2026-10-05

### Added

- Author single-line Label fitting through `textFit="none|shrink"` and
  `minFontSize` (default 12, finite and at least 1 logical pixel).
- Include public documentation in the npm package, with the text authoring
  contract, KUI XML rules and package context.

### Changed

- Align catalog defaults with native components: Label is multiline by default,
  while EditableText defaults to single-line. Omitted defaults stay omitted in
  XML; existing files are not rewritten.
- Keep authored `size` and state sizes independent of runtime fitting results.
  Reject `textFit="shrink"` on EditableText and reject derived `renderedSize`
  and `textFitOverflow` as authored properties.
- Clarify that wordWrap chooses Unicode or character wrapping in multiline mode.
  The semantic document shape and format version remain unchanged.

### Migration

- Rendering the new fitting fields requires matching UI/runtime releases and
  Core 2.1.0 or later. CLI and ui-runtime consumers must update their
  ui-document dependency from 0.8.x to 0.9.x; these pre-1.0 minor ranges do not
  include each other.
- In Core 2.1.0, explicit `multiline="false"` means one unwrapped first line.
  Remove that flag or set it to true on text intended to wrap.

### Tests

- Verify default metadata, omitted-default preservation, KUI round trips,
  state sizes, invalid fit policies and minimums, editable restrictions and
  rejection of derived runtime observations.

## [0.8.0] — 2026-10-04

### Breaking Changes

- Schema-defined string XML properties now read and write literal text without
  backslash type escapes. Numeric-looking text preserves its spelling, including
  trailing zeroes; boolean and reference-looking text remains text. Previous
  synthetic prefixes in string properties are now literal backslashes and must
  be removed explicitly. No automatic file migration is performed.
- Numeric, boolean, resource, token and schema-free collection data retain their
  existing rules. XML entity escaping is unchanged. Editor and CLI consumers must
  adopt the same parser version.

### Tests

- Added literal string, state text, XML entity, backslash and typed collection
  regressions; verified downstream KUI code generation.

## [0.7.0] — 2026-10-03

### Breaking Changes

- Canonical resource manifests require object-valued `subkeys`; old
  comma-separated strings are rejected by the new parser. Refresh each sheet
  in the Editor before compiling against the new package set.

### Added

- Exported resource manifest types, validation, nine-slice lookup, and
  `resolveUIResourceDefaults()` for compiler and preview use.
- Image `scale9Grid` accepts `false` to disable an inherited resource default.
  Source changes in states and variants receive paired grid overrides, so
  exiting a state restores its original grid. Authored XML and history remain
  unchanged.

### Tests

- Added resource default, opt-out, state/variant, and manifest validation
  regressions.

## [0.6.5] — 2026-09-29

### Added

- KUI Skin XML now reads and writes data sources for DataGroup, List, TabBar,
  and ComboBox using `<ArrayCollection><Array><Object ... /></Array></ArrayCollection>`.
  Object attributes become scalar fields in a semantic ArrayCollection
  descriptor, which the CLI can compile into a runtime `ArrayCollection`.

### Changed

- Malformed ArrayCollection property elements and non-scalar item fields are
  rejected during XML parsing or serialization instead of being silently lost.

## [0.6.4] — 2026-09-22

### Added

- Added the optional `skinName` string property to the shared component
  catalog so skinnable controls can select a generated Skin class in authored
  KUI XML.

### Changed

- Skin assignments now participate in normal catalog validation and canonical
  XML parsing and serialization instead of requiring editor-only handling.

## [0.6.3] — 2026-09-22

### Changed

- Fixed and percentage sizes now share the authored `width` and `height` XML
  attributes. Percentage values use a `%` suffix and continue to map to the
  separate `percentWidth` and `percentHeight` semantic properties.
- State-specific size overrides use the same XML form, such as
  `width.compact="50%"`.

### Fixed

- Serialization now rejects nodes that define both fixed and percentage sizes
  on the same axis instead of emitting ambiguous Skin XML.

## [0.6.2] — 2026-09-22

### Added

- Added `createUISkinRoot()` for constructing the internal Group represented by
  the authored `<Skin>` element without assigning it a user-facing node ID.
- Added the reversible `set-node-id` editing operation. It updates node identity
  and every contract reference atomically; omitting the new ID removes the
  authored XML ID while retaining an internal synthetic identity.

### Changed

- `<Skin>` is now the authored visual root container. Root size and layout
  properties are written on the Skin, and visual nodes are direct children;
  redundant root `<Group>` wrappers are no longer serialized.

## [0.6.1] — 2026-09-21

### Fixed

- Canonical XML now writes catalog-defined color properties as readable
  `#RRGGBB` values instead of decimal integers.
- Color properties accept both `#RRGGBB` and `0xRRGGBB` when parsing edited
  XML source.

### Changed

- Authored KUI XML now has a single Skin pipeline. Its root contains the skin
  `class` and optional state names; storage IDs, format versions, targets, and
  default flags are no longer exposed as authored metadata.
- Screen and reusable-component documents remain programmatic semantic models
  and are no longer accepted by the Skin XML parser or serializer.
- Removed the generic `<contract>` block from Skin XML. Node IDs provide skin
  part names, while internal nodes may omit IDs. States use the EUI-style root
  `states` list and local `property.state` attributes, avoiding separate target
  IDs and centralized override blocks.
- Group layouts now use the EUI-style `<layout><HorizontalLayout ... /></layout>`
  property syntax instead of exposing the internal generic object descriptor.
- Catalog resource properties such as `Image.source` use the resource key
  directly instead of repeating an `@resource:image:` type prefix.

### Removed

- Removed generic `<properties>`, `<instance>`, and nested appearance metadata
  from authored Skin XML. Those programmatic semantic-model features no longer
  leak into the Skin compiler format.

---

## [0.6.0] — 2026-09-21

### Added

- Canonical `.kui.xml` parsing and deterministic serialization.
- Direct component tags, custom XML namespaces, typed structured values,
  reusable component instances, and complete contract metadata in KUI XML.

### Changed

- KUI XML is now the package's only authored serialization format.
- `parseUIDocument()` validates the KUI namespace and root metadata before
  returning a semantic document.

### Removed

- JSON document parsing and serialization. JSON remains usable as an HTTP
  transport for in-memory objects, but is no longer an authored file format.

---

## [0.5.2] — 2026-08-31

### Changed

- Renamed document factory modules to kebab-case and updated their internal
  imports, aligning the package structure with the repository naming rules
  without changing the public API or document semantics.

---

## [0.5.1] — 2026-08-31

### Added

- `reserved-skin-part-name` diagnostics for appearance node IDs and public
  part names that would overwrite native `Skin` or inherited runtime members.
- Deterministic Agent-facing appearance naming rules, including reserved `$`
  and `_` prefixes for runtime internals.

### Changed

- Consolidated repeated string assertions, stable ordering, node-reference
  validation, property value-type normalization, and first-diagnostic message
  selection without changing canonical document semantics.
- Removed avoidable non-null assertions from asset and serialization paths.

---

## [0.5.0] — 2026-08-31

### Added

- Component Schema capabilities for supported appearance states, typed native
  appearance parts, required parts, and emitted semantic events.
- `isUIPropertyDefinitionAssignable()` for checking complete source-to-target
  value-domain compatibility.
- Foundation capability metadata for native Button, ToggleButton, ProgressBar,
  TextInput, EditableText, and inherited pointer interactions.

### Changed

- Data-field and component-parameter bindings now require every accepted source
  value to satisfy the destination Schema, including numeric ranges, integer
  constraints, enums, and resource or token categories.
- Appearance validation now rejects unsupported target components, invalid
  native state names, missing required parts, and incompatible part node types.
- Semantic actions now validate their trigger against events emitted by the
  source component type.
- Numeric transitions are limited to appearance states and numeric override
  values. Screen states and variants are rejected because the runtime has no
  root screen-state controller.
- Corrected the foundation Button conformance appearance to use the real
  `down` state instead of the non-existent `pressed` state.

## [0.4.1] — 2026-08-31

### Changed

- Allowed `kui.Label.fontFamily` to consume a registered `font` resource in
  addition to a direct CSS font-family string, making the Phase 3 font
  resource-adapter path reachable through the audited catalog.

## [0.4.0] — 2026-08-31

### Added

- Typed external data fields and named one-way bindings to stable node
  properties, including component-schema compatibility validation.
- Named semantic actions with bounded `tap` and `change` triggers.
- Numeric state-property transition contracts with duration, delay, and
  deterministic easing curves.
- Semantic operations and exact inverse generation for data fields, bindings,
  and actions.
- Phase 3 conformance tests covering serialization, validation, editing, and
  invalid binding or transition targets.

## [0.3.5] — 2026-08-31

### Added

- Audited `kui.EditableText` Schema as the low-level editable appearance part
  used by `kui.TextInput`, inheriting Label typography and text properties.
- Shared plain-text input, prompt, and character-restriction contracts between
  `EditableText` and `TextInput`.
- Catalog validation for valid and invalid editable appearance-part values.

## [0.3.4] — 2026-08-31

### Added

- Audited `kui.TextInput` Schema for text, prompt, color, password display,
  character limits, restrictions, and the current plain-text input type.
- Catalog validation coverage for valid TextInput documents, invalid input
  modes, invalid character limits, and properties owned by appearance parts.

### Changed

- Reused the shared text-content property contracts between Label and
  TextInput without introducing an incorrect runtime inheritance relationship.

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
