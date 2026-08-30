# Changelog

All notable changes to `@kurot/ui-document` are documented here.

---

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
