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
    type: 'eui.Group',
    properties: { width: 1280, height: 720 },
    children: [
      createUINode({
        id: 'title',
        type: 'eui.Label',
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
  keys.

See [Architecture](./docs/architecture.md) for the current contracts and
package boundaries.

## Intended boundary

The package owns the serializable UI document model and its deterministic
operations. Planned layers include:

- component, state, binding, and resource-reference schemas beyond the current
  document, node, and property model;
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
