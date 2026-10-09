# @kurot/ui-runtime

**0.10.0 is published**, verified on npm on 2026-10-09. Development installs published
Core 2.4.0, UI 3.4.0 and ui-document 0.13.0 with a matching registry lock and
no local overrides. See [centered flips](../../docs/centered-flips.md) for adoption.

Runtime materialization layer for validated Kurot UI documents. It converts
canonical `kui.*` nodes into real `@kurot/ui` components without moving
document semantics into the component library.

> **Current version: 0.10.0 (published).** Requires `@kurot/core@^2.4.0`,
> `@kurot/ui@^3.4.0`, and `@kurot/ui-document@^0.13.0`. Uses UI's atomic
> complete-skin lifecycle for materialized appearances.

See [CHANGELOG.md](CHANGELOG.md) for release history and migration notes.

## Installation

```bash
pnpm add @kurot/ui-runtime@^0.10.0 @kurot/ui-document@^0.13.0 @kurot/ui@^3.4.0 @kurot/core@^2.4.0
```

Install all peers explicitly. Runtime 0.10.0 requires the
centered flip API and layout frame in Core 2.4.0/UI 3.4.0, plus document 0.13.0
authoring metadata. Older runtime 0.9.0 remains valid for native text on its
published Core/UI/document chain. Public creation/controller APIs and semantic
format version 2 remain unchanged; existing apps do not require an upgrade.

Published CLI 3.3.0 uses ui-document 0.11.0 for build-time Label presets/colors and emits
skins that run directly through UI. That compilation path does not require
ui-runtime. Runtime 0.8.2 and CLI 3.3.0 share the same document parser.
See the [project style contract](../ui-document/docs/project-styles.md).

## Centered flips in 0.10.0

Display property handlers apply typed boolean `flipX`/`flipY` to native objects.
Group and Component subclasses reflect around their validated local layout
frame while retaining authored scale and position. State removal restores prior
flags; failed data-binding updates roll back without losing the applied flag.
Reflection geometry and input coordinates remain Core/UI responsibilities.

Development installs published Core 2.4.0, UI 3.4.0 and document 0.13.0 with one
shared Core. Runtime 0.10.0 is published. Consumers install
all matching peers explicitly and rebuild when adopting it.

## BitmapLabel and RichLabel in 0.9.0

Native BitmapLabel uses typed font resources and glyph metrics. RichLabel uses
literal textFlow runs, continuous wrapping and automatic sizing. Neither
inherits Label or accepts Label typography/presets/fitting. Explicit handlers
validate resolved values; font adapters may return a Core resource key or a
ready BitmapFont without transferring ownership.

Whole-flow states and typed data bindings use existing native and atomic
restoration paths. Empty arrays clear content; state removal and failed writes
restore prior runs/fonts. See [text materialization](docs/text-components.md)
for resource setup, example XML and lifecycle boundaries.

## Project style colors in 0.8.1

Read the optional `resource/config/style.json` in the application or Editor,
then resolve color references into a disposable preview copy:

```ts
import { parseUIDocument, parseUIStyleSheet, resolveUIStyleColors } from '@kurot/ui-document';
import { createKurotUI } from '@kurot/ui-runtime';

// The caller reads styleConfiguration and skinSource; the kernel performs no I/O.
const style = parseUIStyleSheet(styleConfiguration);
const authored = parseUIDocument(skinSource);
const preview = resolveUIStyleColors(authored, style.colors);
const result = createKurotUI(preview);
stage.addChild(result.root);
```

XML uses `@style:colors:<key>` for base and state colors, for example
`textColor.disabled="@style:colors:disabled-text"`. Resolution includes inactive
states and variants. Resolve every registered appearance asset as well as the
root document before materialization. Continue editing and saving `authored`;
never persist the expanded RGB values from `preview`. Missing colors fail
explicitly. The previous `@token:color:<key>` XML prefix is rejected; files are
not migrated automatically, and ordinary text remains literal.

Alternatively, register each parsed palette entry as a `color` token in the
supplied `UIAssetRegistry` and materialize the authored document directly.
The internal token record is unchanged. Font loading, Stage ownership and
live project theme updates remain application responsibilities; dispose the
materialization and remove its root when it is no longer needed.

## Label presets in 0.8.2

Expand Default-only Label `textStyle="@style:labels:<key>"` before color
resolution. Local fields and individual Skin state fields take precedence:

```ts
import { parseUIDocument, parseUIStyleSheet, resolveUILabelStyles, resolveUIStyleColors } from '@kurot/ui-document';
import { createKurotUI } from '@kurot/ui-runtime';

const style = parseUIStyleSheet(styleConfiguration);
const authored = parseUIDocument(skinSource);
const expanded = resolveUILabelStyles(authored, style);
const preview = resolveUIStyleColors(expanded, style.colors);
const result = createKurotUI(preview);
stage.addChild(result.root);
```

Resolve every registered appearance and nested component document as well as the
root before materialization. Preserve `authored` for saving/history; expanded
native fields do not replace the preset reference. Missing presets fail explicitly.
The runtime accepts the resolved native properties and does not perform stylesheet
I/O, font loading or live theme switching. Resource defaults, if used, resolve
before Label presets. Core/UI need no new release for preset expansion.

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

The runtime supports `kui.Group`, `kui.Label`, `kui.BitmapLabel`, `kui.RichLabel`,
`kui.EditableText`, `kui.Image`,
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

Design tokens resolve from the supplied `UIAssetRegistry`; the runtime does not
read `resource/config/style.json` or load project fonts itself. Resource references
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
`resolveUIResourceDefaults()` from `@kurot/ui-document@^0.12.0` before passing
it to `createKurotUI()`. Runtime Images then receive resource-derived grids.
`scale9Grid: false` clears an inherited grid, including during native Skin
state changes; leaving the state restores the previous grid. The runtime does
not read or migrate the resource manifest itself. See the
[resource nine-slice contract](../ui-document/docs/resource-nine-slice.md).
