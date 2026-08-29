# @kurot/ui-document

Headless semantic document foundation for Kurot UI tooling. It is intended to
provide one format and one mutation model shared by the future visual UI
builder, `@kurot/cli`, and Agent-driven UI generation.

> **Early development (0.1.0).** The package boundary and format-version entry
> point are established. The document schema and editing APIs are not stable
> yet.

## Installation

```bash
pnpm add @kurot/ui-document
```

The package has no runtime dependency on `@kurot/core` or `@kurot/ui`. It
models UI documents but does not instantiate or render runtime components.

## Current API

```ts
import { UI_DOCUMENT_FORMAT_VERSION } from '@kurot/ui-document';

console.log(UI_DOCUMENT_FORMAT_VERSION);
```

## Intended boundary

The package will own the serializable UI document model and the deterministic
operations performed on it:

- document, node, component, property, state, binding, and resource-reference schemas;
- validation and diagnostics;
- commands, transactions, undo, and redo;
- deterministic serialization and document migrations;
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
