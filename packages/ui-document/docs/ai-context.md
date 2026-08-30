# @kurot/ui-document — AI context map

Read this before exploring `src/`. The source and `src/index.ts` remain the
authority for current behavior and public exports.

Package identity: `@kurot/ui-document@0.3.5`. This is a headless,
runtime-independent semantic asset package for Kurot UI authoring. It has no
runtime dependencies. Format version 2 is intentionally incompatible with the
0.1 proof model.

## 1. Directory map

```text
src/
├── index.ts                   Public export barrel only.
└── kurot/
    ├── version.ts             Current semantic format version (2).
    ├── model/                 Assets, nodes, contracts, instances, references.
    ├── document/              Constructors, deterministic traversal, lookup.
    ├── validation/            Strict single-document validation + diagnostics.
    ├── serialization/         Validated parse + canonical JSON serialization.
    ├── schema/                Component definitions, registry, semantic checks.
    ├── catalog/               Audited built-in semantic component subsets.
    ├── assets/                Project catalogs and cross-document validation.
    └── editing/               Operations, transactions, revisions, diff, history.
```

## 2. Current contracts

- A document has exactly `kind`, `formatVersion`, `id`, `assetKind`, `contract`,
  and `root`.
- `assetKind` is `screen`, `component`, or `appearance`.
- A component asset must publish `contract.componentType`; an appearance must
  publish `contract.targetType`. Other asset kinds may not use those fields.
- Contracts contain parameter schemas, public parts, named Slots, runtime
  states, and authoring variants. Parts, state overrides, and variant overrides
  target stable node IDs in the defining asset.
- Component parameters may bind explicitly to internal node properties; binding
  records contain stable target IDs and property names, never expressions.
- A node has `id`, `type`, `properties`, optional `instance`, optional
  `appearance`, and ordered `children`. An appearance reference may select one
  variant published by the referenced appearance Contract.
- A reusable instance stores a stable component-asset reference, parameter
  values, an optional variant, public-part overrides, and projected Slot trees.
  It never embeds the referenced component's internal tree.
- Ordinary `children` are invalid on a reusable instance during project
  validation; projected content must use a Slot declared by the source asset.
- Node IDs are non-empty and unique across the complete document, including
  trees projected into Slots.
- Properties accept strings, booleans, finite numbers, arrays, and plain
  string-keyed objects. Undefined, null, functions, platform objects, cyclic
  values, and non-finite numbers are invalid.
- Tagged references use explicit records: `{ kind: 'asset', assetId }`,
  `{ kind: 'resource', resourceType, key }`, or
  `{ kind: 'token', tokenType, key }`.
- Tagged references are distinct from ordinary structured objects. Reference
  schemas require the complete exact record, and an appearance selection with
  `variant` is not a generic property-level asset reference.
- `UIAssetRegistry` owns explicit per-project assets, resource identities, and
  design tokens. It is not global state.
- `validateUIAssetRegistry` checks component/appearance compatibility,
  parameters, variants, parts, Slots, typed project references, duplicate
  component identities, and asset dependency cycles.
- Parsing accepts only `UI_DOCUMENT_FORMAT_VERSION`. There is no v1 migration;
  never silently reinterpret older data.
- Unknown document, node, contract, instance, or reference keys are errors.
- Serialization validates first, preserves array order, and normalizes all
  schema-controlled records and recursive property-object keys.

## 3. Component schema and catalog

- Component definitions remain runtime-independent metadata. Never import
  actual `@kurot/ui` classes into this package.
- Property value categories include primitive/structured values plus explicit
  `asset-reference`, `resource-reference`, and `token-reference` categories.
- `resourceTypes` and `tokenTypes` further constrain which reference categories
  a property accepts.
- Schema inheritance is single-parent through `extends`; resolution is
  deterministic and detects missing bases and cycles.
- The foundation catalog contains abstract `kurot.DisplayObject`,
  `kui.UIComponent`, and `kui.Component`, plus concrete `kui.Group`,
	`kui.Label`, `kui.EditableText`, `kui.Image`, `kui.Rect`, `kui.Button`,
	`kui.ToggleButton`, `kui.ProgressBar`, and `kui.TextInput`.
- `kui.ToggleButton` inherits the Button contract and changes the authored
  `toggle` default to `true`. `kui.ProgressBar` directly extends
  `kui.Component`, matching the runtime class rather than pretending it
  inherits the separate `Range` implementation.
- `kui.TextInput` directly extends `kui.Component`. It exposes the properties
  forwarded by TextInput itself; typography and prompt styling target its
  appearance parts instead of pretending the control extends Label.
- `kui.EditableText` extends `kui.Label` and exists primarily as TextInput's
  editable `textDisplay` appearance part. Prefer `kui.TextInput` in ordinary
  application UI.
- `kui.*` is canonical. EUI identifiers belong only at a legacy EXML adapter
  boundary.
- `Image.source` and `Button.icon` use typed image/sprite-frame references.
  Audited colors and layout measurements accept appropriate design tokens.
- Runtime and compatibility fields are not automatically authoring APIs.
  `currentState`, `skinName`, and `hostComponentKey` are deliberately absent;
  states and appearances are modeled directly.

## 4. Public API groups

- Model: `UIDocument`, `UIAssetKind`, `UIAssetContract`, `UINode`,
  `UIComponentInstance`, reference types, property-value types,
  `UI_DOCUMENT_KIND`, `UI_DOCUMENT_FORMAT_VERSION`.
- Creation/query: `createUIDocument`, `createUINode`,
  `createUIAssetContract`, `createUIComponentInstance`, reference constructors,
  `findUINode`, `visitUINodes`.
- Single-document validation: `validateUIDocument`, `isUIDocument`, and
  diagnostic types.
- Serialization: `parseUIDocument`, `serializeUIDocument`, parse and validation
  error classes.
- Schema: component/property definitions, `UIComponentRegistry`, resolution
  errors, `matchesUIPropertyDefinition`, and component-aware validation.
- Catalog: `createKurotUIFoundationRegistry`,
  `registerKurotUIFoundation`.
- Project assets: `UIAssetRegistry`, project resource/token definitions, and
  `validateUIAssetRegistry`.
- Editing: `UIOperation`, `applyUIOperation`, `UITransaction`,
  `applyUITransaction`, revision snapshots, `diffUIDocuments`,
  `UIDocumentHistory`, and `UIEditError`.

## 5. Important limitations

- Actions, data binding, migrations, and a final human-facing `.kui` syntax are
  not implemented.
- `@kurot/ui-runtime@0.2.x` consumes format version 2 and materializes the
  implemented static reuse and appearance slice, including selected appearance
  variants. Bindings, actions, and reconciliation remain pending.
- The foundation component catalog is intentionally incomplete; do not invent
  unsupported properties from Egret, PixiJS, LayaAir, or FairyGUI conventions.

## 6. Task → file map

| Task | Start with |
| --- | --- |
| Change asset/node/reference shapes | `model/` |
| Add constructors or tree queries | `document/` |
| Add a structural invariant | `validation/validateUIDocument.ts` and related validators |
| Change canonical JSON | `serialization/json.ts` and golden fixtures |
| Change property semantics | `schema/UIComponentDefinition.ts`, `schema/matchesUIPropertyDefinition.ts` |
| Change built-in component fields | `catalog/properties/` |
| Change project catalogs or cross-document rules | `assets/` |
| Change operations, transactions, diff, or history | `editing/` |
| Change public exports | nearest folder `index.ts`, then `src/index.ts` |

## 7. Commands

```sh
pnpm --dir packages/ui-document install
pnpm --dir packages/ui-document build
pnpm --dir packages/ui-document test
```
