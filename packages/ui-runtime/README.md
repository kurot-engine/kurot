# @kurot/ui-runtime

Runtime materialization layer for validated Kurot UI documents. It converts
canonical `kui.*` nodes into real `@kurot/ui` components without moving
document semantics into the component library.

```ts
import { createKurotUI } from '@kurot/ui-runtime';

const result = createKurotUI(document, { assets });
stage.addChild(result.root);
```

The runtime supports `kui.Group`, `kui.Label`, `kui.Image`, `kui.Rect`, and
`kui.Button`, including their audited inherited properties, children, layout
descriptors, and nine-slice rectangles. Format-v2 component assets are expanded
with parameter bindings, variants, part overrides, and projected Slot content.
Appearance assets become native Kurot skins and states.

Version 0.2 performs full-tree creation. It does not yet provide incremental
reconciliation, dynamic reusable-component state activation, appearance-variant
selection, bindings, actions, or transitions.

The result also provides a stable node lookup for editor selection and event
wiring:

```ts
const startButton = result.instances.get('startButton');
const internalLabel = result.instances.get('startButton/label');
```

Design tokens resolve from the supplied `UIAssetRegistry`. Resource references
use their registered key by default; applications can provide
`resolveResource(reference, definition)` to return the runtime value expected by
their resource system.

Project component types are added by extending a foundation
`UIComponentRegistry` and supplying a matching runtime adapter. Invalid
documents, unsupported values, and missing adapters throw
`KurotUIRuntimeError` with a stable code and exact document path.

## Boundary

- `@kurot/ui-document` describes and validates UI.
- `@kurot/ui-runtime` creates and connects runtime objects.
- `@kurot/ui` implements component behavior and layout.
- `@kurot/core` renders the resulting display tree.

This package does not own Canvas or Stage lifecycle and does not define a
second document model.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm preview
```

The preview is available at `http://localhost:5173/preview/` by default.
