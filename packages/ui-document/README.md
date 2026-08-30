# @kurot/ui-document

Headless semantic document foundation for Kurot UI tooling. It is intended to
provide one format and one mutation model shared by the future visual UI
builder, `@kurot/cli`, and Agent-driven UI generation.

> **Early development (0.1.0).** The first document model, validation, query,
> and deterministic JSON APIs are implemented. The schema is not stable yet.

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
  required properties, child policies, and abstract types.
- union-valued properties, enum values, numeric ranges, integer constraints,
  serializable defaults, and editor-facing semantic formats.

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
stores an asset key or URL rather than a `Texture`, and readonly objects such as
`Image.bitmap` are not document properties. `Group.layout` and
`Image.scale9Grid` currently accept semantic objects; their nested shapes will
be tightened when the layout and structured-value catalogs are introduced.
State declarations and bindings are also reserved for their own semantic
layers rather than being accepted as untyped component properties.

See [Architecture](./docs/architecture.md) for the current contracts and
package boundaries.

## Intended boundary

The package owns the serializable UI document model and its deterministic
operations. Planned layers include:

- the remaining component catalog, nested structured-value constraints, states,
  bindings, and resource-reference schemas;
- commands, transactions, undo, and redo;
- document migrations;
- adapters for formats such as EXML.

It will not own rendering, runtime UI components, editor panels, filesystem
or network I/O, or model-provider integration. Those concerns belong to
`@kurot/ui`, the visual builder, CLI orchestration, and Agent adapters
respectively.

## Development

```bash
pnpm install
pnpm build
pnpm test
```
