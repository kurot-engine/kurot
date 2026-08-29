# @kurot/ui-document — AI context map

Read this before exploring `src/`. The source and `src/index.ts` remain the
authority for current behavior and public exports.

Package identity: `@kurot/ui-document@0.1.0`. This is a headless, runtime-
independent semantic document package for Kurot UI editing workflows. It has
no runtime dependencies.

Source root: `src/kurot/`. Public API: `src/index.ts` re-exports the `model`,
`document`, `validation`, and `serialization` barrels plus the current format
version.

## 1. Directory map

```text
src/
├── index.ts                   Public export barrel only.
└── kurot/
    ├── version.ts             Current semantic format version.
    ├── model/                 UIDocument, UINode, recursive property values.
    ├── document/              Constructors, deterministic traversal, lookup.
    ├── validation/            Strict unknown-input validation + diagnostics.
    └── serialization/         Validated parse + canonical JSON serialization.
```

## 2. Current contracts

- A document has exactly `kind`, `formatVersion`, `id`, and `root`.
- A node has exactly `id`, `type`, `properties`, and `children`.
- Node IDs are non-empty and unique across the whole document.
- `type` is an external component-registry key. This package never resolves it
  to an `@kurot/ui` runtime class.
- Properties accept strings, booleans, finite numbers, arrays, and plain
  string-keyed objects. Undefined, null, functions, platform objects, cyclic
  values, and non-finite numbers are invalid.
- Children remain in source order. Object property keys are sorted only when
  serialized, producing stable JSON without changing array order.
- Parsing accepts only `UI_DOCUMENT_FORMAT_VERSION`. Migration support does
  not exist yet; never silently reinterpret another version.
- Unknown document or node keys are errors. This is deliberate so malformed
  Agent output is diagnosed instead of silently discarded.

## 3. Public API

- Model: `UIDocument`, `UINode`, `UIPropertyPrimitive`, `UIPropertyObject`,
  `UIPropertyValue`, `UI_DOCUMENT_KIND`, `UI_DOCUMENT_FORMAT_VERSION`.
- Creation/query: `createUIDocument`, `createUINode`, `findUINode`,
  `visitUINodes`, `CreateUIDocumentOptions`, `CreateUINodeOptions`.
- Validation: `validateUIDocument`, `isUIDocument`, `UIDiagnostic`,
  `UIDiagnosticCode`, `UIDiagnosticSeverity`.
- Serialization: `parseUIDocument`, `serializeUIDocument`,
  `UIDocumentParseError`, `UIDocumentValidationError`.

## 4. Package boundary

- Owns pure, serializable UI semantics and deterministic transformations.
- Must remain independent of `@kurot/core` and `@kurot/ui` runtime classes.
- Must not perform filesystem, network, DOM, canvas, or WebGL operations.
- Must not contain visual editor panels or model-provider integration.
- Format adapters translate at the boundary; external formats do not define
  the internal document model.

Commands/history, states, bindings, resource references, migrations, and EXML
adapters are planned but are not implemented APIs. Do not infer their shape
from Egret, Unity, FairyGUI, or other formats.

## 5. Task → file map

| Task | Start with |
| --- | --- |
| Change the semantic model | `model/UIDocument.ts`, `model/UINode.ts`, `model/UIPropertyValue.ts` |
| Add construction or tree queries | `document/create.ts`, `document/query.ts` |
| Add an invariant or diagnostic | `validation/validateUIDocument.ts`, `validation/UIDiagnostic.ts` |
| Change JSON parsing or canonical output | `serialization/json.ts` |
| Change public exports | the nearest folder `index.ts`, then `src/index.ts` |

## 6. Commands

```sh
pnpm --dir packages/ui-document install
pnpm --dir packages/ui-document build
pnpm --dir packages/ui-document test
```
