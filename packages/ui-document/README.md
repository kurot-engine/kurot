# @kurot/ui-document

Headless semantic UI documents, canonical Skin KUI XML, validation, reusable
assets and transactional editing. Package version: **0.13.2** (published).
The semantic format is **2**; the package has no Kurot runtime dependency.

Read [KUI XML](docs/kui-xml.md), [text components](docs/text-components.md),
[project styles](docs/project-styles.md) and
[resource defaults](docs/resource-nine-slice.md) for authoring contracts.
Native components own layout/rendering; this kernel validates data and preserves
authored property/state intent without loading fonts, images or engine code.

## Installation

```bash
pnpm add @kurot/ui-document@^0.13.2
```

The package has no runtime dependency on `@kurot/core` or `@kurot/ui`. It
models UI documents but does not instantiate or render runtime components.
CLI's document dependency and ui-runtime 0.10.0's peer/development requirements
use `^0.13.0`, which accepts 0.13.2 without dependent SDK releases. Consumers
adopt through their own installations/locks; exact pins need explicit updates,
and bundled applications need rebuilding to include a dependency fix.

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

Button, ToggleButton, RadioButton, CheckBox and ToggleSwitch labels, including
named-state labels, preserve literal strings such as `"10.00"`, `"false"` and
reference-looking text. RadioButton `groupName` is also a literal string.
The XML codec knows the built-in inheritance independently of the partial
foundation catalog; consumers still register controls beyond that public subset
for semantic validation. Unknown project types retain scalar inference.

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
`kui.Label`, `kui.EditableText`, `kui.BitmapLabel`, `kui.RichLabel`, `kui.Image`,
`kui.Rect`, `kui.Button`, `kui.ToggleButton`, `kui.ProgressBar`, and `kui.TextInput` nodes. `Group`
accepts ordered children; the other concrete nodes are leaves.

`kui.*` is the canonical Kurot UI namespace. Authored Skin files use the
[`KUI XML format`](./docs/kui-xml.md); EUI names and EXML are not stored in the
semantic document.

The foundation catalog declares the serializable authoring properties inherited
from Kurot display objects and UI layout elements, then adds the audited direct
properties of the concrete components. Unknown properties are rejected.
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

`@kurot/ui-runtime@0.10.0` uses document `^0.13.0` and validates/materializes
format-version-2 assets,
including reusable instances, parameter bindings, Slots, component variants,
part overrides, design tokens, resource hooks, and native appearance
skins/states. It also executes the bounded data, action, and transition
contracts. Incremental reconciliation remains separate
runtime work.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Resource nine-slice defaults

`parseUIResourceConfigEntries()` validates object-valued sheet `subkeys` and
image/frame `scale9grid` values. Old comma-separated subkeys are rejected;
refresh those sheets explicitly in the Editor. Before compiling or previewing
a document, call `resolveUIResourceDefaults(document, resources)` on each Skin
or other appearance asset. The returned copy inherits resource grids while
preserving authored XML and history. A local `scale9Grid="false"` disables
inheritance, and state source changes get matching grid overrides.

See the [resource nine-slice contract](docs/resource-nine-slice.md) for lookup
priority, validation and authored format.

## Project fonts and colors

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
version 2 is unchanged. Label presets are described below. Schema-defined strings such as Label text
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

Authored palette references use `@style:colors:<key>`; other XML prefixes are
rejected. Authoring files remain unchanged by resolution. The CLI compiler
resolves stylesheet colors and Label presets during KUI compilation. Its
document `^0.13.0` dependency accepts 0.13.2. Runtime 0.10.0 requires the same range;
consumers resolve colors in preview copies or register palette entries in the
runtime asset registry. Editor and application dependencies must also adopt the same parser.
No Core/UI rendering change is required. See
[project styles](docs/project-styles.md) for the full contract.

## Label presets

`style.json.labels` defines reusable Label appearance: font, size, color, outline,
emphasis, alignment and spacing. `textStyle="@style:labels:<key>"` selects one in
Default; local fields and state field overrides take precedence. Use
`resolveUILabelStyles()` before `resolveUIStyleColors()` on disposable copies,
retaining authored XML/history references. `getUILabelStyle()`, `UILabelStyle`,
`UILabelStyleProperty` and `UI_LABEL_STYLE_PROPERTIES` describe this contract.
The `UIStyleSheet` type requires a `labels` map; `parseUIStyleSheet()`
supplies an empty map when the optional JSON section is absent.
See [project styles](docs/project-styles.md) for configuration and resolution order.
CLI's document `^0.13.0` dependency and runtime 0.10.0's matching requirements
accept 0.13.2 without overrides.
Runtime 0.10.0 also requires UI `^3.4.0` and Core `^2.4.0`; preset expansion
itself does not introduce a new native rendering requirement.
