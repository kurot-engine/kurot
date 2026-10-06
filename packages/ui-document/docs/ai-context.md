# @kurot/ui-document — AI context map

Read this before exploring `src/`. The source and `src/index.ts` remain the
authority for current behavior and public exports.

Package identity: `@kurot/ui-document@0.10.0`. This is a headless,
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
    ├── serialization/         Validated parse + canonical KUI XML serialization.
    ├── schema/                Component definitions, registry, semantic checks.
    ├── catalog/               Audited built-in semantic component subsets.
    ├── assets/                Project catalogs and cross-document validation.
    └── editing/               Operations, transactions, revisions, diff, history.
```

## 2. Current contracts

- A document has exactly `kind`, `formatVersion`, `id`, `assetKind`, `contract`,
  and `root`.
- `assetKind` is `screen`, `component`, or `appearance`.
- A component asset must publish `contract.componentType`. An appearance may
  publish `contract.targetType` for programmatic cross-asset validation, but
  authored Skin XML does not expose it; the build derives associations from
  project conventions. Other asset kinds may not use those fields.
- Contracts contain parameter schemas, public parts, named Slots, runtime
  states, and authoring variants. Parts, state overrides, and variant overrides
  target stable node IDs in the defining asset.
- Contracts may declare typed external data fields, named one-way bindings to
  node properties, and semantic actions triggered by `tap` or `change`.
- Appearance-state overrides may define bounded numeric transitions with
  duration, delay, and a deterministic easing curve. Component and screen
  states cannot contain transitions; screen states and variants are currently
  unsupported because no root state controller consumes them.
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
- Skin XML nodes may omit `id`. Parsing assigns a deterministic synthetic ID
  for editor selection, state overrides, history, and other internal references;
  serialization omits that synthetic value again. An explicit child-node ID is
  an authored public skin-part name. The Skin root is never a public part.
- **Agent authoring rule for appearance assets:** explicit child-node IDs and
  public part names are installed as named properties on a native `@kurot/ui`
  `Skin`. Do not use a name that collides with `Skin` or its inherited runtime
  members, such as `setPart`, `getPart`, `states`, or `hostComponent`; names
  beginning with `$` or `_` are reserved for runtime internals. Such a collision
  is invalid authored data.
- Properties accept strings, booleans, finite numbers, arrays, and plain
  string-keyed objects. Undefined, null, functions, platform objects, cyclic
  values, and non-finite numbers are invalid.
- XML changes in 0.8.0 treat schema-defined string properties
  (`text`, `label`, state text) as literal strings without backslash type escaping.
  Old synthetic prefixes become literal characters; do not migrate them silently.
  Numeric/boolean properties and schema-free collection fields retain their types.
  Editor and CLI must share this parser contract; see `docs/kui-xml.md`.
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
- Component definitions declare inherited semantic events and optional
  appearance capabilities: exact native states plus typed or required parts.
- Parameter and data bindings are directional. Every value accepted by the
  source Schema must satisfy the target Schema, including range, enum,
  integer, resource-category, and token-category constraints.
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
- `kui.*` is canonical. Authored Skin files use `.kui.xml`; do not add EXML or
  JSON compatibility paths.
- DataGroup, List, TabBar, and ComboBox use an `<ArrayCollection><Array>`
  property element with scalar `<Object />` items for `dataProvider`; this is
  semantic data, not a tree of display children. DataGroup/List/TabBar also
  accept a separate container `<layout>` property element.
- `Image.source` and `Button.icon` use typed image/sprite-frame references.
  Audited colors and layout measurements accept appropriate design tokens.
- `Label.fontFamily` accepts either a CSS font-family string or a registered
  `font` resource reference.
- Label's catalog default for `multiline` is true; EditableText's is false.
  Omitted default properties are not inserted into XML. Core 2.1.0 interprets
  explicit false as one unwrapped first line.
- Label `textFit` accepts `none` (default) or `shrink`. `minFontSize` defaults
  to 12 and accepts finite numbers >= 1. EditableText overrides `textFit` to
  accept only `none`; inherited minimum metadata does not enable fitting.
- `size` and state sizes are authored inputs. `renderedSize` and
  `textFitOverflow` are runtime results, deliberately absent from the catalog.
- Runtime and compatibility fields are not automatically authoring APIs.
  `currentState` and `hostComponentKey` remain deliberately absent. Skinnable
  controls expose `skinName` because compiled KUI Skin modules register their
  generated factory by qualified class name.

## 4. Public API groups

- Model: `UIDocument`, `UIAssetKind`, `UIAssetContract`, `UINode`,
  `UIComponentInstance`, reference types, property-value types,
  `UI_DOCUMENT_KIND`, `UI_DOCUMENT_FORMAT_VERSION`.
- Creation/query: `createUIDocument`, `createUISkinRoot`, `createUINode`,
  `createUIAssetContract`, `createUIComponentInstance`, reference constructors,
  `findUINode`, `visitUINodes`.
- Single-document validation: `validateUIDocument`, `isUIDocument`, and
  diagnostic types.
- Serialization: `parseUIDocument`, `serializeUIDocument`, parse and validation
  error classes.
- Schema: component/property definitions, `UIComponentRegistry`, resolution
  errors, `matchesUIPropertyDefinition`,
  `isUIPropertyDefinitionAssignable`, and component-aware validation.
- Catalog: `createKurotUIFoundationRegistry`,
  `registerKurotUIFoundation`.
- Project assets: `UIAssetRegistry`, project resource/token definitions, and
  `validateUIAssetRegistry`. Project styles: `UIStyleSheet`, `UIStyleFontFamily`,
  `UIStyleFontFace`, `parseUIStyleSheet`, `getUIStyleFontAlias`,
  `getUIStyleFontFamily`, `getUIStyleColor` and `resolveUIStyleColors`.
- Editing: `UIOperation` (including atomic `set-node-id` reference updates),
  `applyUIOperation`, `UITransaction`,
  `applyUITransaction`, revision snapshots, `diffUIDocuments`,
  `UIDocumentHistory`, and `UIEditError`.

## 5. Important limitations

- KUI XML is the single authored Skin syntax; Screen and reusable-component
  documents remain programmatic, and migrations stay outside the format.
- Authored fixed and percentage sizes share `width`/`height`; a `%` suffix maps
  to the semantic `percentWidth`/`percentHeight` properties. Do not emit those
  internal property names as XML attributes.
- `@kurot/ui-runtime@0.8.1` consumes format version 2 and executes the current
  reuse, appearance, data-binding, semantic-action, transition, and typed
  resource-adapter slice. Incremental reconciliation remains pending.
- The foundation component catalog is intentionally incomplete; do not invent
  unsupported properties from Egret, PixiJS, LayaAir, or FairyGUI conventions.

## 6. Task → file map

| Task                                              | Start with                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Change asset/node/reference shapes                | `model/`                                                                             |
| Add constructors or tree queries                  | `document/`                                                                          |
| Add a structural invariant                        | `validation/validateUIDocument.ts` and related validators                            |
| Change canonical KUI XML                          | `serialization/xml.ts`, `serialization/xml/`, and golden fixtures                    |
| Change property semantics                         | `schema/UIComponentDefinition.ts`, `schema/matchesUIPropertyDefinition.ts`           |
| Change built-in component fields                  | `catalog/properties/`                                                                |
| Change project catalogs or cross-document rules   | `assets/`                                                                            |
| Change project fonts/colors or their resolution   | `assets/UIStyleSheet.ts`, `assets/resolveUIStyleColors.ts`, `docs/project-styles.md` |
| Change operations, transactions, diff, or history | `editing/`                                                                           |
| Change public exports                             | nearest folder `index.ts`, then `src/index.ts`                                       |

## 7. Commands

```sh
pnpm --dir packages/ui-document install
pnpm --dir packages/ui-document build
pnpm --dir packages/ui-document test
```

## Resource configuration change in 0.7.0

`parseUIResourceConfigEntries()` validates object subkeys, and
`resolveUIResourceDefaults()` injects nine-slice defaults into a copy. See
[the resource-default contract](resource-nine-slice.md)
for conversion and compilation boundaries.

## Text authoring contract in 0.9.0

The package describes and validates fitting policy; it does not measure text,
derive font sizes or import runtime classes. The semantic format remains 2.
CLI 3.2 and ui-runtime 0.8.1 consume this catalog through their ^0.10.0 ranges;
consumers on earlier ^0.9.0 ranges must update explicitly before adopting styles.
Rendering requires Core >= 2.1.0 and
the matching UI Label implementation.
See [text authoring](text-layout.md) for defaults, XML preservation and
validation boundaries, and [Label text layout](../../ui/docs/label-text-layout.md)
for native rendering behavior.

## Project styles in 0.10.0

Read [project-styles.md](project-styles.md). UIStyleSheet.ts owns the shared font
and immutable RGB color contract; resolveUIStyleColors.ts resolves only color tokens
in a disposable copy, including inactive state/variant values. No renderer or I/O.
XML colors use @style:colors:<key>, corresponding to the colors section of style.json.
The internal token record remains unchanged. Reject the previous @token:color:<key>
prefix and unsupported style sections; never reinterpret schema-defined strings.
Only resolve disposable copies for compilation/preview, retaining the authored
document for XML/history. Font loading and configuration I/O belong to consumers.
