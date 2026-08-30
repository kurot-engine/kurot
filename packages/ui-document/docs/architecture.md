# UI Document Architecture

`@kurot/ui-document` is the shared, headless semantic layer between UI
producers and consumers. It describes editable UI assets without depending on
how they are visually edited, persisted, compiled, or rendered.

```text
Visual UI Builder ─┐
CLI / Adapter ─────┼─> UI assets ─> validation / edits / serialization
Agent Tools ───────┘       │
                           ├─> runtime preview
                           └─> static factory compiler
```

## Asset model

Format version 2 defines three asset kinds:

- a `screen` composes built-in controls and reusable project components;
- a `component` owns an internal tree and publishes a stable contract;
- an `appearance` owns visual composition for one target component type.

All kinds share a root `UINode` and a `UIAssetContract`. A contract may publish
typed parameters, stable parts, named Slots, runtime states, and authoring
variants. State and variant behavior is represented as ordered property
overrides addressed through stable node IDs.

The model does not store runtime class instances, functions, DOM objects,
textures, or unrestricted executable expressions.

## Reusable component identity

A reusable component instance stores only:

- the stable ID of its component asset;
- typed parameter values;
- an optional variant;
- explicit overrides against published parts;
- child trees projected into published Slots.

The parent never receives a copy of the component's private hierarchy. This is
the core invariant that lets definition changes propagate and keeps diffs small
and reviewable.

Parameters may publish explicit bindings to internal node properties. Runtime
adapters can therefore apply one typed instance value to stable destinations
without evaluating code or relying on naming conventions.

Node IDs remain unique across the parent document, including content projected
into Slots. Tree traversal uses normal children first, then Slot names in stable
sorted order while preserving child order within each Slot.

## Project references

Documents use explicit tagged references instead of plausible strings:

```ts
{ kind: 'asset', assetId: 'balance-bar' }
{ kind: 'resource', resourceType: 'image', key: 'ui.balance.icon' }
{ kind: 'token', tokenType: 'color', key: 'color.action.primary' }
```

Appearance selections and generic property-level asset references intentionally
share their stable asset identity without sharing a type. This prevents a
contextual `variant` selection from being accepted by an unrelated asset-valued
component property.

`UIAssetRegistry` is an isolated project catalog for UI assets, resources, and
design tokens. `validateUIAssetRegistry` checks identities and meaning that
cannot be verified inside a single file:

- source assets exist and publish the expected component type;
- appearances target the receiving node type;
- appearance references may select only variants published by that appearance;
- parameters, variants, parts, and Slots belong to the source contract;
- required values and Slot content are present;
- single-capacity Slots do not receive multiple children;
- referenced resources and tokens exist with matching categories;
- component type identities are unique;
- asset dependencies are acyclic.

## Structural validation

External data is `unknown` until it passes `validateUIDocument` or
`parseUIDocument`. Unknown fields are rejected so misspellings and unsupported
Agent output remain visible as structured diagnostics.

Constructors make valid shapes concise but do not replace validation. Local
validation owns exact shapes, serializable values, stable IDs, and references;
project validation owns cross-asset resolution.

Format version 1 is rejected. There is no compatibility layer because the 0.1
model was an initial proof rather than a production authoring format.

## Deterministic serialization

`serializeUIDocument` validates before writing. It preserves semantic array
order and normalizes document, contract, node, instance, reference, property
definition, and recursive property-object keys. Golden fixtures pin the output
for a component definition, an appearance, and a screen containing two compact
instances.

JSON is currently the canonical transport and conformance syntax. This does
not decide the eventual human-facing `.kui` syntax; future XML-like or editor
formats must translate losslessly to this model.

## Component schema

`UIComponentRegistry` describes runtime component capabilities without
importing `@kurot/ui`. Definitions support inheritance, child policies,
primitive and structured property categories, numeric and enum constraints,
and explicit asset/resource/token-reference categories.

Resource and token properties can further declare accepted categories. For
example, `kui.Image.source` accepts typed image or sprite-frame references,
`kui.Label.fontFamily` accepts typed font references, and audited color fields
accept color tokens.

The foundation catalog remains curated rather than reflective. It includes
`kui.Group`, `kui.Label`, `kui.EditableText`, `kui.Image`, `kui.Rect`,
`kui.Button`, `kui.ToggleButton`, `kui.ProgressBar`, and `kui.TextInput` plus
their abstract bases. `EditableText` is cataloged for appearance composition;
ordinary application UI should prefer the complete `TextInput` control.
Runtime-owned and compatibility-shaped fields are not automatically authoring
APIs. `currentState`, `skinName`, and `hostComponentKey` are absent because
states and appearances are first-class semantics.

## Runtime boundary

This package never imports `@kurot/core` or `@kurot/ui`. Runtime construction,
resource loading, Canvas/WebGL work, editor UI, filesystem access, and model
provider calls stay outside it.

`@kurot/ui-runtime@0.3.x` consumes format version 2 and passes the shared
component, screen, and appearance conformance fixtures. It expands reusable
instances, executes bounded data bindings and semantic actions, dispatches
typed resources, and installs native appearance skins/states with selected
variants and numeric transitions. Incremental reconciliation remains runtime
work.

## Editing kernel

Every meaningful mutation is represented as a typed semantic operation. The
operation set covers node structure, ordered children and Slots, properties,
appearances, reusable-instance values, Part overrides, and public Contract
entries. Successful operations return exact inverses.

Transactions apply an ordered operation list atomically against an expected
revision. Only the final snapshot is validated, allowing one intent to cross a
temporarily invalid intermediate state without exposing it. Failed operations,
validation errors, and stale revisions leave the original snapshot untouched.

`UIDocumentHistory` builds undo and redo on inverse transactions. Revisions are
monotonic even across history navigation, which prevents delayed Agent work
from overwriting a document after an undo. `diffUIDocuments` provides stable
semantic changes for review panels and Agent summaries.
