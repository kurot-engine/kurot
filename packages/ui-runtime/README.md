# @kurot/ui-runtime

Runtime materialization layer for validated Kurot UI documents. It converts
canonical `kui.*` nodes into real `@kurot/ui` components without moving
document semantics into the component library.

> **Current release: 0.8.0.** Requires `@kurot/core@^2.1.0`,
> `@kurot/ui@^3.1.0`, and `@kurot/ui-document@^0.9.0`. Uses UI's atomic
> complete-skin lifecycle for materialized appearances.

## Label text fitting in 0.8.0

Materialized Labels support `textFit: 'none' | 'shrink'` and `minFontSize`.
Set `multiline: false` and constrain the available size to shrink a single line;
an automatic axis does not impose a fit limit. The authored `size` stays intact,
while the native Label derives `renderedSize` during layout. State restoration,
data bindings and font readiness follow the same UI contract as CLI-built skins.
See [runtime text layout](docs/label-text-layout.md) for an example and lifecycle
guidance.

Explicit `multiline: false` now remains single-line even with automatic height.
Use `true` or omit the flag when wrapping is intended. Shrinking defaults to off
and does not apply to EditableText. Derived size and overflow are read-only
runtime observations; they are never written into the document.

Upgrade these dependencies together. Refresh legacy sheet manifests in Kurot
Editor before loading resources; see the
[resource migration guide](../ui-document/docs/resource-nine-slice.md).

Version 0.7 adopts the document kernel's literal-string XML contract. Parsed
`text="100.80"` and `text.down="false"` remain exact strings when materialized,
including native appearance states and restoration. Remove earlier synthetic
backslash type escapes explicitly; they now represent literal characters. XML
entities, numeric/boolean properties and schema-free collection types are
unchanged. The runtime does not migrate authored XML or add another parser.
See [KUI XML values](../ui-document/docs/kui-xml.md#values).

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
variant. Authored `skinName` values are forwarded to skinnable controls and
resolved through the generated Skin factories registered by the KUI build.
Authored IDs inside appearance documents are exposed as native Skin parts, so
controls can bind conventional parts such as `labelDisplay` without a separate
contract block in Skin XML. The implicit Skin root remains authoring metadata:
its direct children are installed on the host component and laid out against
the host's actual size, while its width and size-limit properties configure the
native Skin. Size-limit design tokens resolve through the project registry, and
state or variant properties authored on the implicit root apply to that native
Skin. Anonymous appearance nodes remain internal, while generated synthetic
identities still allow native states such as `source.down` to update them.

Version 0.5 carries the first bounded visual-semantics slice onto the typed,
atomic UI 2.0 skin lifecycle while retaining component capability validation
and transactional data updates. Contract data fields drive declared one-way
property bindings, semantic actions expose declared `tap` and `change` events,
and numeric appearance overrides may use bounded transitions. The package still
performs full-tree creation; incremental preview reconciliation belongs to the
next phase.

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

## Resource nine-slice defaults in 0.6.0

Resolve each authored document and registered appearance with
`resolveUIResourceDefaults()` from `@kurot/ui-document@^0.9.0` before passing
it to `createKurotUI()`. Runtime Images then receive resource-derived grids.
`scale9Grid: false` clears an inherited grid, including during native Skin
state changes; leaving the state restores the previous grid. The runtime does
not read or migrate the resource manifest itself. See the
[resource nine-slice contract](../ui-document/docs/resource-nine-slice.md).
