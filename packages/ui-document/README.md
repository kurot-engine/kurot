# @kurot/ui-document

**0.13.0 is published**, verified on npm on 2026-10-09. See
[centered flips](../../docs/centered-flips.md) for APIs and consumer requirements.

Headless semantic document foundation for Kurot UI tooling. It provides one
format and one mutation model shared by Kurot Editor, `@kurot/cli`, and
Agent-driven UI generation.

> **Package version: 0.13.0 (published).** KUI XML is the canonical authored format. The
> schema remains pre-1.0, so later minor releases may still refine its contract.

## Centered flip metadata in 0.13.0

Display nodes inherit boolean `flipX` and `flipY`, defaulting to false. XML,
state overrides and transactional history preserve the flags without changing
negative scale or semantic format version 2. The headless kernel has no runtime
dependency on Core/UI and does not calculate reflection geometry.

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="skins.Reflected" states="down">
    <Image id="art" flipX="true" flipX.down="false" />
</Skin>
```

Rendering requires published Core 2.4.0/UI 3.4.0. Compilation uses CLI 3.5.0;
materialization uses ui-runtime 0.10.0. Both consumer releases are published. Consumers on ^0.12.0 explicitly adopt ^0.13.0 and rebuild.

## BitmapLabel and RichLabel in 0.12.0

The foundation catalog now models both native components independently of Label.
BitmapLabel uses literal `text` plus a typed bitmap-font resource. RichLabel uses
only `textFlow`, with literal font, size, emphasis, colors and outline per run:

```xml
<BitmapLabel text="100.80" font="score_font" />
<RichLabel width="240">
    <textFlow>
        <Span text="Balance: " size="20" />
        <Span text="100.80" bold="true" size="20" textColor="#FFCC00" />
    </textFlow>
</RichLabel>
```

RichLabel supports continuous wrapping and automatic geometry, with whole-flow
Skin state overrides. Exported `UITextFlow`, `UITextRun`, `UITextRunStyle` and
`isUITextFlow` share the strict data contract without any engine dependency.
Label presets and automatic shrinking stay on Label. Format version 2 is unchanged.
See [the text component contract](docs/text-components.md) for fields, literal
whitespace, clearing, states and consumer requirements. Native rendering uses
published UI 3.3.0 and Core ^2.3.0 (tested Core 2.3.1). Published CLI 3.3.1 and
ui-runtime 0.8.2 still use ^0.11.0. Published CLI 3.4.0 and ui-runtime 0.9.0
adopt this contract; applications must upgrade explicitly to author the new types.

## Label text authoring in 0.9.0

The foundation catalog now declares `textFit` (`none` or `shrink`) and
`minFontSize` for Labels. Authored `size` and state overrides remain unchanged;
derived `renderedSize` and `textFitOverflow` are runtime observations and are
rejected as document properties. EditableText accepts only `textFit="none"`.

```xml
<Label text="KZT 10 000,00" width="140" size="24"
       multiline="false" textFit="shrink" minFontSize="16" />
```

Label's catalog default for `multiline` is true; EditableText's is false.
Omitted defaults are not inserted into XML. Explicit `multiline="false"` uses
Core 2.1.0's single-line behavior; remove the flag or set it to true for wrapping.
The semantic format remains version 2, and files are not migrated automatically.
See the [text authoring contract](docs/text-layout.md) for validation and
consumer requirements. This package models these fields; native rendering uses
UI 3.1.0 and Core 2.1.0 or later within Core 2.x. CLI 3.3.0 consumes this kernel
at build time. Published ui-runtime 0.8.2 requires ui-document `^0.11.0`;
runtime 0.8.1 excludes this kernel and must be upgraded alongside it.

## Installation

```bash
pnpm add @kurot/ui-document@^0.13.0
```

The package has no runtime dependency on `@kurot/core` or `@kurot/ui`. It
models UI documents but does not instantiate or render runtime components.

## Quick Start

```ts
import {
	createUIDocument,
	createUISkinRoot,
	createUINode,
	serializeUIDocument,
	validateUIDocument,
} from '@kurot/ui-document';

const document = createUIDocument({
	id: 'game.MainSkin',
	assetKind: 'appearance',
	root: createUISkinRoot({
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

KUI XML serializes Skin documents only. Screen and reusable-component
documents are programmatic semantic models and do not share the authored Skin
file pipeline.

Version 0.8.0 treats schema-defined string attributes as literal text.
For example, `<Label text="100.80" size="48" />` retains the text `100.80` and
the numeric font size. String properties no longer need backslash type escapes;
existing synthetic prefixes become literal backslashes. Adopt this contract in
both Editor and CLI, and remove old prefixes explicitly. XML entities and typed
collection fields retain their existing rules. See [KUI XML values](docs/kui-xml.md#values).

The authored `<Skin>` element is a nonvisual root: root size and layout
properties are written on it, and visual nodes are direct children. Display
transforms, including `flipX`/`flipY`, belong on the visual children.
Use `createUISkinRoot()` for the corresponding internal Group when constructing
a Skin document in TypeScript. Only child nodes exposed as skin parts need an
authored `id`. Fixed and percentage sizes use the same XML attributes:
`width="320"` is fixed while `width="100%"` is relative to the parent. The
semantic model retains separate `width` and `percentWidth` properties so
editing and runtime layout do not mix unlike units in one value.

Data-driven controls can author a collection as a child property element:

```xml
<List itemRendererSkinName="skins.ItemRendererSkin">
    <ArrayCollection>
        <Array>
            <Object label="First" value="1" />
            <Object label="Second" value="2" />
        </Array>
    </ArrayCollection>
</List>
```

The `ArrayCollection` element maps to `dataProvider`; its `Object` attributes
become scalar fields. DataGroup, List, TabBar, and ComboBox support this XML
form. A Group layout remains a separate `<layout>` child property.

## Current capabilities

- explicit screen, reusable-component, and appearance assets;
- appearance references with optional validated variant selection;
- public component contracts containing typed parameters, parts, Slots,
  runtime-neutral states, and authoring variants;
- typed external data fields, named one-way property bindings, and bounded
  semantic actions;
- optional numeric transitions on appearance-state property overrides;
- compact reusable instances containing an asset reference and only their
  parameter values, variant, part overrides, and projected Slot content;
- typed project resource and design-token references;
- shared project font configuration, immutable named colors and explicit
  stylesheet color references resolved in compilation/preview copies;
- `UIAssetRegistry` and project-wide validation of asset identities,
  references, type compatibility, public contracts, and dependency cycles;
- explicit `UIDocument`, `UINode`, and recursive `UIPropertyValue` types;
- constructors that assign the current format discriminator and version;
- deterministic pre-order traversal and node lookup;
- strict validation of schema keys, versions, identifiers, unique node IDs,
  plain property values, finite numbers, and acyclic trees;
- structured diagnostics with stable codes and JSON-style paths;
- validated KUI XML parsing and deterministic canonical serialization;
- runtime-independent component definitions and an isolated component registry;
- inherited appearance-state, native-part, and emitted-event capabilities;
- abstract base definitions, single-parent inheritance, deterministic schema
  resolution, and derived property overrides;
- validation of registered component types, known property categories,
  required properties, child policies, and abstract types;
- union-valued properties, enum values, numeric ranges, integer constraints,
  serializable defaults, editor-facing semantic formats, and accepted resource
  or token categories;
- immutable semantic operations with exact inverse generation;
- atomic node-ID edits that update every contract reference and can remove an
  authored XML ID while retaining an internal editor identity;
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

`set-node-id` changes a node identity and every state, variant, binding, action,
part, and Slot reference to it as one operation. Omitting `id` removes the
authored XML ID; the document retains a hidden synthetic identity so selection,
history, and inline state properties continue to work.

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
`kui.Label`, `kui.EditableText`, `kui.Image`, `kui.Rect`, `kui.Button`,
`kui.ToggleButton`, `kui.ProgressBar`, and `kui.TextInput` nodes. `Group`
accepts ordered children; the other concrete nodes are leaves.

`kui.*` is the canonical Kurot UI namespace. Authored Skin files use the
[`KUI XML format`](./docs/kui-xml.md); EUI names and EXML are not stored in the
semantic document.

The foundation catalog declares the serializable authoring properties inherited
from Kurot display objects and UI layout elements, then adds the audited direct
properties of all nine concrete components. Unknown properties are rejected.
Skinnable controls inherit the optional `skinName` property, whose value is the
qualified class name of a generated Skin, for example
`<Button skinName="game.ButtonSkin" />`.

TextInput exposes only properties forwarded by the real control. Font, size,
alignment, and prompt styling belong to its `textDisplay` and `promptDisplay`
appearance parts rather than being duplicated as TextInput properties.
`EditableText` is the low-level editable `textDisplay` part; application UI
should normally author `TextInput` rather than use it as a competing control.

Runtime-owned values are deliberately excluded. For example, `Image.source`
stores a typed project resource reference rather than a `Texture`, and readonly
objects such as `Image.bitmap` are not document properties. `Group.layout` and
`Image.scale9Grid` currently accept semantic objects; their nested shapes will
be tightened when the layout and structured-value catalogs are introduced.
States and variants live in asset contracts rather than untyped component
properties. Compatibility-shaped `currentState` and `hostComponentKey` are not
canonical authoring fields.

Component Schemas also declare whether a type accepts an appearance, the exact
native states that appearance may define, required typed parts, and semantic
events available to actions. Binding compatibility is directional: the entire
source value domain must fit the destination rather than merely sharing one
possible type.

See [Architecture](./docs/architecture.md) for the current contracts and
package boundaries.

## Intended boundary

The package owns the serializable UI asset model, KUI XML syntax, and its
deterministic operations. Planned work includes:

- the remaining component catalog and nested structured-value constraints.

It will not own rendering, runtime UI components, editor panels, filesystem
or network I/O, or model-provider integration. Those concerns belong to
`@kurot/ui`, the visual builder, CLI orchestration, and Agent adapters
respectively.

`@kurot/ui-runtime@0.8.2` validates and materializes format-version-2 assets,
including reusable instances, parameter bindings, Slots, component variants,
part overrides, design tokens, resource hooks, and native appearance
skins/states. It also executes the bounded data, action, and transition
contracts introduced in 0.4. Incremental reconciliation remains separate
runtime work.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Resource nine-slice defaults in 0.7.0

`parseUIResourceConfigEntries()` validates object-valued sheet `subkeys` and
image/frame `scale9grid` values. Old comma-separated subkeys are rejected;
refresh those sheets explicitly in the Editor. Before compiling or previewing
a document, call `resolveUIResourceDefaults(document, resources)` on each Skin
or other appearance asset. The returned copy inherits resource grids while
preserving authored XML and history. A local `scale9Grid="false"` disables
inheritance, and state source changes get matching grid overrides.

See the [resource nine-slice contract](docs/resource-nine-slice.md) for lookup
priority, conversion, and release order.

## Project fonts and colors in 0.10.0

The optional fixed `resource/config/style.json` is independent of
`default.res.json`. `parseUIStyleSheet()` validates schemaVersion 1, font roles,
resource-relative font URLs, fallback families and weights, plus an optional
`colors` palette of named `#RRGGBB` values. An existing stylesheet requires its
font section; absent colors produce an empty immutable palette.

`getUIStyleFontAlias()` exposes stable `kurot-<role>` aliases,
`getUIStyleFontFamily()` returns the alias/fallback CSS stack, and
`getUIStyleColor()` returns a numeric RGB value, including black as zero.
Unknown roles/colors fail explicitly. Font loading and reading configuration
remain consumer responsibilities.

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin" states="disabled">
    <Label id="labelDisplay" textColor="#FF9900"
           textColor.disabled="@style:colors:disabled-text" />
</Skin>
```

`@style:colors:<key>` selects the `colors` section of `style.json`. The internal
reference remains `{ kind: 'token', tokenType: 'color', key }`; semantic format
version 2 is unchanged. Version 0.11.0 also supports Label presets as described
below. Schema-defined strings such as Label text
remain literal.

```ts
import { parseUIDocument, parseUIStyleSheet, resolveUIStyleColors } from '@kurot/ui-document';

// The consumer reads these inputs; the document package performs no I/O.
const style = parseUIStyleSheet(styleConfiguration);
const authored = parseUIDocument(skinSource);
const preview = resolveUIStyleColors(authored, style.colors);
```

Resolve a disposable copy before compilation/materialization, including nested
skins and inactive states/variants. Continue saving and editing `authored`;
never replace it with `preview` or persist the expanded RGB values. Missing
colors report the semantic path, and other token categories stay unresolved.

This is an XML syntax change: the previous `@token:color:<key>` prefix is
rejected. Update authored color references explicitly; files are not migrated
automatically. Published CLI 3.3.0 depends on `^0.11.0` and resolves stylesheet
colors and Label presets during KUI compilation. Runtime 0.8.2 adopts the same
range and is published;
consumers resolve colors in preview copies or register palette entries in the
runtime asset registry. Editor and application dependencies must also adopt the same parser.
No Core/UI rendering change is required. See
[project styles](docs/project-styles.md) for the full contract.

## Label presets in 0.11.0

`style.json.labels` defines reusable Label appearance: font, size, color, outline,
emphasis, alignment and spacing. `textStyle="@style:labels:<key>"` selects one in
Default; local fields and state field overrides take precedence. Use the new
`resolveUILabelStyles()` before `resolveUIStyleColors()` on disposable copies,
retaining authored XML/history references. `getUILabelStyle()`, `UILabelStyle`,
`UILabelStyleProperty` and `UI_LABEL_STYLE_PROPERTIES` describe this contract.
The `UIStyleSheet` type requires a `labels` map; `parseUIStyleSheet()`
supplies an empty map when the optional JSON section is absent.
See [project styles](docs/project-styles.md) for configuration and release order.
Version 0.11.0 and CLI 3.3.0 are published. CLI compiles presets with the
registry kernel through `^0.11.0`, without a local override. CLI 3.2.1 does not
support presets. Published ui-runtime 0.8.2 uses the same kernel range;
runtime 0.8.1 excludes it. Editor 0.19.2 adopts all three registry packages.
