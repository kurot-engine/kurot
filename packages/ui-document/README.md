# @kurot/ui-document

Headless semantic document foundation for Kurot UI tooling. It is intended to
provide one format and one mutation model shared by the future visual UI
builder, `@kurot/cli`, and Agent-driven UI generation.

> **Early development (0.3.x).** The reusable authoring model and headless
> editing kernel are implemented, but the schema remains pre-1.0 and is not yet
> a production file format.

## Installation

```bash
pnpm add @kurot/ui-document
```

The package has no runtime dependency on `@kurot/core` or `@kurot/ui`. It
models UI documents but does not instantiate or render runtime components.

## Quick Start

```ts
import {
  createUIDocument,
  createUINode,
  serializeUIDocument,
  validateUIDocument,
} from '@kurot/ui-document';

const document = createUIDocument({
  id: 'main-screen',
  assetKind: 'screen',
  root: createUINode({
    id: 'root',
    type: 'kui.Group',
    properties: { width: 1280, height: 720 },
    children: [
      createUINode({
        id: 'title',
        type: 'kui.Label',
        properties: { text: 'Kurot' },
      }),
    ],
  }),
});

const diagnostics = validateUIDocument(document);
const source = serializeUIDocument(document);
```

`UIDocument` and `UINode` are runtime-independent semantic data. A component
`type` is an external registry key; this package does not import or instantiate
the corresponding `@kurot/ui` class.

## Current capabilities

- explicit screen, reusable-component, and appearance assets;
- appearance references with optional validated variant selection;
- public component contracts containing typed parameters, parts, Slots,
  runtime-neutral states, and authoring variants;
- compact reusable instances containing an asset reference and only their
  parameter values, variant, part overrides, and projected Slot content;
- typed project resource and design-token references;
- `UIAssetRegistry` and project-wide validation of asset identities,
  references, type compatibility, public contracts, and dependency cycles;
- explicit `UIDocument`, `UINode`, and recursive `UIPropertyValue` types;
- constructors that assign the current format discriminator and version;
- deterministic pre-order traversal and node lookup;
- strict validation of schema keys, versions, identifiers, unique node IDs,
  plain property values, finite numbers, and acyclic trees;
- structured diagnostics with stable codes and JSON-style paths;
- validated JSON parsing and deterministic serialization with sorted property
  keys;
- runtime-independent component definitions and an isolated component registry;
- abstract base definitions, single-parent inheritance, deterministic schema
  resolution, and derived property overrides;
- optional validation of registered component types, known property categories,
  required properties, child policies, and abstract types;
- union-valued properties, enum values, numeric ranges, integer constraints,
  serializable defaults, editor-facing semantic formats, and accepted resource
  or token categories;
- immutable semantic operations with exact inverse generation;
- atomic transactions, monotonic revisions, stale-edit conflict detection,
  deterministic diffs, and in-memory undo/redo history.

## Reusable assets

A parent stores a reference to a reusable component, not a copy of its internal
tree:

```ts
import {
  createUIAssetReference,
  createUIComponentInstance,
  createUIDocument,
  createUINode,
  UIAssetRegistry,
  validateUIAssetRegistry,
} from '@kurot/ui-document';

const screen = createUIDocument({
  id: 'lobby-screen',
  assetKind: 'screen',
  root: createUINode({
    id: 'root',
    type: 'kui.Group',
    children: [
      createUINode({
        id: 'play-action',
        type: 'game.ActionCard',
        instance: createUIComponentInstance({
          source: createUIAssetReference('action-card'),
          parameters: { label: 'Play' },
        }),
      }),
    ],
  }),
});

const registry = new UIAssetRegistry();
// actionCardDefinition is a component UIDocument created separately.
registry.registerAsset(actionCardDefinition);
registry.registerAsset(screen);
const diagnostics = validateUIAssetRegistry(registry);
```

The component definition owns its internal hierarchy and publishes only its
stable contract. Definition changes can therefore propagate without expanding
or rewriting every parent asset.

Component parameters may declare explicit bindings to internal node properties.
This keeps parameter behavior deterministic without embedding JavaScript or
expression strings in the document.

## Editing transactions

Editors, Agent tools, and CLI transformations should commit the same semantic
operations instead of mutating document objects directly:

```ts
import { UIDocumentHistory } from '@kurot/ui-document';

const history = new UIDocumentHistory(document);
history.commit({
  id: 'widen-spin-button',
  expectedRevision: history.snapshot.revision,
  summary: 'Make the primary action wider',
  operations: [
    {
      kind: 'set-node-property',
      nodeId: 'spin-button',
      property: 'width',
      value: 320,
    },
  ],
});

history.undo();
history.redo();
```

Transactions either commit completely or leave the input snapshot untouched.
Undo and redo create new monotonically increasing revisions, so an older Agent
response cannot become current again merely because the user navigated history.

Component definitions can remain intentionally incomplete while their runtime
properties are reviewed:

```ts
import { UIComponentRegistry } from '@kurot/ui-document';

const registry = new UIComponentRegistry();
registry.register({
  type: 'schema.UIComponent',
  abstract: true,
  allowUnknownProperties: true,
});

registry.register({
  type: 'game.ProfileCard',
  extends: 'schema.UIComponent',
});

const resolved = registry.resolve('game.ProfileCard');
```

Base definitions can be registered after their derived definitions. Resolution
does not depend on registration order and reports missing bases or inheritance
cycles explicitly. A complete `@kurot/ui` component catalog is not included yet.

## Kurot UI foundation catalog

The first audited catalog subset is available through an explicit registry
factory:

```ts
import { createKurotUIFoundationRegistry } from '@kurot/ui-document';

const registry = createKurotUIFoundationRegistry();
```

It defines the abstract semantic bases `kurot.DisplayObject`,
`kui.UIComponent`, and `kui.Component`, plus the concrete `kui.Group`,
`kui.Label`, `kui.Image`, `kui.Rect`, and `kui.Button` nodes. `Group` accepts
ordered children; the other four concrete nodes are leaves.

`kui.*` is the canonical Kurot UI namespace. EUI names belong only to legacy
EXML adapters and are not stored in the semantic document.

The foundation catalog declares the serializable authoring properties inherited
from Kurot display objects and UI layout elements, then adds the audited direct
properties of all five concrete components. Unknown properties are rejected.

Runtime-owned values are deliberately excluded. For example, `Image.source`
stores a typed project resource reference rather than a `Texture`, and readonly
objects such as `Image.bitmap` are not document properties. `Group.layout` and
`Image.scale9Grid` currently accept semantic objects; their nested shapes will
be tightened when the layout and structured-value catalogs are introduced.
States and variants live in asset contracts rather than untyped component
properties. Compatibility-shaped `currentState`, `skinName`, and
`hostComponentKey` are not canonical authoring fields.

See [Architecture](./docs/architecture.md) for the current contracts and
package boundaries.

## Intended boundary

The package owns the serializable UI asset model and its deterministic
operations. Planned layers include:

- the remaining component catalog and nested structured-value constraints;
- declarative data binding and actions;
- document migrations;
- adapters for formats such as EXML.

It will not own rendering, runtime UI components, editor panels, filesystem
or network I/O, or model-provider integration. Those concerns belong to
`@kurot/ui`, the visual builder, CLI orchestration, and Agent adapters
respectively.

`@kurot/ui-runtime@0.2.x` validates and materializes format-version-2 assets,
including reusable instances, parameter bindings, Slots, component variants,
part overrides, design tokens, resource hooks, and native appearance
skins/states. Incremental reconciliation and the remaining dynamic semantics
are separate runtime work; they do not belong in this headless package.

## Development

```bash
pnpm install
pnpm build
pnpm test
```
