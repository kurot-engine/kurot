# @kurot/ui-runtime

Runtime materialization layer for validated Kurot UI documents. It converts
canonical `kui.*` nodes into real `@kurot/ui` components without moving
document semantics into the component library.

```ts
import { createKurotUI } from '@kurot/ui-runtime';

const result = createKurotUI(document, { assets });
stage.addChild(result.root);
```

The runtime supports `kui.Group`, `kui.Label`, `kui.EditableText`, `kui.Image`,
`kui.Rect`, `kui.Button`, `kui.ToggleButton`, `kui.ProgressBar`, and
`kui.TextInput`, including their audited inherited properties, children, layout
descriptors, and nine-slice rectangles. ProgressBar appearances bind live thumb
and label parts. TextInput appearances bind a real EditableText `textDisplay`
and Label `promptDisplay`, preserving native focus, text entry, restrictions,
and prompt states. Reusable component assets are expanded with parameter
bindings, variants, part overrides, and projected Slot content. Appearance
assets become native Kurot skins and states, including the selected appearance
variant.

Version 0.4 completes the first bounded visual-semantics slice with component
capability validation and transactional data updates. Contract data
fields drive declared one-way property bindings, semantic actions expose
declared `tap` and `change` events, and numeric appearance overrides may use
bounded transitions. The package still performs full-tree creation; incremental
preview reconciliation belongs to the next phase.

The result also provides a stable node lookup for editor selection and event
wiring:

```ts
const startButton = result.instances.get('startButton');
const internalLabel = result.instances.get('startButton/label');

const state = result.stateControllers.get('startButton');
state?.setState('disabled');
state?.clearState();

result.data.setValue('balanceText', '$1,250.00');
result.dispose();
```

Required data fields must receive an initial value or declare a Schema default.
A later `setValue()` commits only after every binding target succeeds; failure
restores earlier targets and leaves the controller value unchanged. Built-in
and ordinary reflective properties are restored automatically. A custom
adapter that stores bound state outside its runtime object must provide the
paired `captureProperty` and `restoreProperty` hooks.

Reusable-component state controllers apply Contract state overrides at runtime
and restore the exact pre-state values when cleared. Controllers are isolated
per component instance; an unknown state throws `KurotUIRuntimeError`.

Design tokens resolve from the supplied `UIAssetRegistry`. Resource references
use their registered key by default. Applications may replace the adapter for
each semantic category without adding resource-system behavior to the document
model:

```ts
const result = createKurotUI(document, {
	assets,
	resourceAdapters: {
		image: reference => resource.getRes(reference.key),
		font: reference => fontFamilies[reference.key],
		spine: reference => spineAssets[reference.key],
		animation: reference => animations[reference.key],
	},
	onAction: action => controller.handle(action.action),
});
```

Image and sprite-frame references can feed built-in `Image` properties. Spine
and animation remain project component boundaries: their category adapters
resolve the registered resource, while a project component adapter owns the
corresponding runtime object.

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
