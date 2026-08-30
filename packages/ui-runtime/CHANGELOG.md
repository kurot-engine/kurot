# Changelog

All notable changes to `@kurot/ui-runtime` are documented here.

---

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
