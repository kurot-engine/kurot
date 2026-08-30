# Kurot UI Layer Architecture

This document defines the ownership and dependency boundaries of Kurot's UI
stack. It covers the existing `@kurot/core`, `@kurot/ui`,
`@kurot/ui-document`, `@kurot/ui-runtime`, and `@kurot/cli` packages, plus the
future visual UI editor.

The short version is:

```text
core          renders
ui            implements component behavior
ui-document   describes UI
ui-runtime    instantiates UI documents
cli           builds and converts assets
editor        authors and previews UI
```

## Layer model

```text
                         Future UI Editor
                         authors UIDocument
                         previews through ui-runtime
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
          @kurot/ui-document             @kurot/ui-runtime
          semantic data model ──────────> document execution
                                                │
                                                ▼
                                          @kurot/ui
                                          UI behavior
                                                │
                                                ▼
                                         @kurot/core
                                      display and rendering
```

`@kurot/ui-runtime` now provides the first complete materialization path. The
visual editor and incremental document updates remain planned layers.

## `@kurot/core`

`@kurot/core` answers: **How is a visual object displayed and rendered?**

It owns:

- display objects and the display tree;
- transforms, bounds, hit testing, and low-level input events;
- bitmap, text, vector graphics, texture, filter, and mask primitives;
- WebGL and Canvas 2D rendering;
- rendering instructions, pipes, batching, and render groups;
- geometry, resources, networking, and foundational media APIs.

It does not own:

- UI measurement and layout;
- controls such as `Button` and `Label`;
- semantic UI documents or component schemas;
- UI authoring and editor workflows.

Every browser-rendered Kurot layer ultimately depends on `@kurot/core`.

## `@kurot/ui`

`@kurot/ui` answers: **How does a UI component behave?**

It owns:

- concrete components such as `Group`, `Label`, `Image`, `Rect`, and `Button`;
- measurement, layout constraints, and automatic sizing;
- validation phases such as `commitProperties`, `measure`, and
  `updateDisplayList`;
- layouts, skins, states, bindings, themes, collections, and UI events;
- the runtime behavior of interactive controls.

It does not own:

- the `UIDocument` format;
- Agent-facing component schemas;
- document parsing or component-tree materialization;
- editor panels or editing commands;
- WebGL and Canvas 2D renderer implementations.

The package remains usable directly without a semantic document:

```ts
const button = new Button();
button.label = 'Start';
stage.addChild(button);
```

`@kurot/ui` currently preserves EUI-compatible runtime and EXML workflows.
That compatibility does not make `eui.*` the identity namespace of future UI
documents.

## `@kurot/ui-document`

`@kurot/ui-document` answers: **What does a UI contain?**

It owns:

- `UIDocument`, `UINode`, and serializable property values;
- canonical `kui.*` component identities;
- component and property schemas;
- deterministic component inheritance and registry resolution;
- document validation, parsing, serialization, traversal, and lookup;
- semantic metadata consumed by Agents, CLIs, and editors.

It does not own:

- Kurot runtime class instances;
- component construction or property assignment;
- Canvas, Stage, DOM, WebGL, or browser lifecycle management;
- resource loading, skin execution, or runtime layout;
- editor user interfaces.

The package is a headless TypeScript data layer with no dependency on
`@kurot/core` or `@kurot/ui`. A semantic node looks like:

```json
{
  "id": "startButton",
  "type": "kui.Button",
  "properties": {
    "label": "Start",
    "width": 240,
    "height": 80
  },
  "children": []
}
```

EUI names belong at a legacy format-adapter boundary. For example, a future
EXML adapter may translate `<eui:Button>` into the canonical `kui.Button`
identity, but the semantic document does not store the EUI namespace.

## `@kurot/ui-runtime`

`@kurot/ui-runtime` answers: **How does a UI document become a running Kurot
component tree?**

It owns:

- validation before materialization;
- component factories such as `kui.Button` to `new Button()`;
- safe application of inherited and component-specific properties;
- child-tree construction;
- layout and rectangle descriptor resolution;
- resource and skin identifier forwarding to existing UI mechanisms;
- structured runtime errors containing document node paths;
- custom component adapters supplied by the owning application;
- a stable node-ID-to-instance lookup for editor and Agent integration.

It may later own incremental document updates and execution of semantic states
and bindings after those formats are defined by `@kurot/ui-document`.

It does not own:

- the component behavior implemented by `@kurot/ui`;
- the rendering pipeline implemented by `@kurot/core`;
- the document format implemented by `@kurot/ui-document`;
- Canvas and Stage lifecycle management;
- visual editor panels.

The initial API returns both the root and a stable instance lookup:

```ts
const result = createKurotUI(document, options);
stage.addChild(result.root);
const startButton = result.instances.get('startButton');
```

The adapter creates renderable objects, but `@kurot/ui` still performs layout
and control behavior, while `@kurot/core` performs rendering.

The current audited foundation supports `kui.Group`, `kui.Label`, `kui.Image`,
`kui.Rect`, and `kui.Button`; Basic, horizontal, vertical, and tile layouts;
and serializable nine-slice rectangles. Resource loading and skin lookup remain
the responsibility of the existing UI runtime adapters and Theme system.

## `@kurot/cli`

`@kurot/cli` answers: **How is a project built and how are authoring formats
converted into deployable assets?**

It owns:

- project scaffolding and configuration;
- TypeScript and esbuild orchestration;
- build-time EXML compilation;
- resource and custom-component discovery;
- future EXML-to-`UIDocument` migration tooling;
- future static compilation from `UIDocument` to TypeScript or JavaScript
  component factories.

It does not own:

- browser rendering or Stage lifecycle;
- component implementations;
- live editor interaction;
- dynamic document execution.

The CLI is a build-time tool and must not become a browser runtime dependency.

## Future visual UI editor

The visual editor answers: **How does a user create, inspect, modify, and
preview UI?**

It will own:

- the component palette, hierarchy tree, property inspector, and resource
  browser;
- selection, drag operations, resize handles, and viewport controls;
- editing commands, transactions, undo, and redo;
- Agent-assisted generation and modification workflows;
- saving and loading `UIDocument`;
- browser preview hosting, including Canvas, Stage, scaling, refresh, and error
  presentation.

The editor should use `@kurot/ui-document` as its only stored document model
and `@kurot/ui-runtime` as its preview execution layer. It must not invent a
second private component format.

## Dependency rules

The intended dependency direction is:

```text
@kurot/core
├── @kurot/ui
├── @kurot/game
└── @kurot/ui-runtime
       ├── @kurot/ui
       └── @kurot/ui-document

@kurot/ui-document        no engine runtime dependency

@kurot/cli
└── @kurot/ui-document    build-time use only

Future UI Editor
├── @kurot/ui-document
└── @kurot/ui-runtime
```

The following reverse dependencies are prohibited:

- `@kurot/core` must not depend on any UI package;
- `@kurot/ui` must not depend on `@kurot/ui-document` or the editor;
- `@kurot/ui-document` must not depend on runtime engine packages;
- `@kurot/ui-runtime` must not define a competing document model;
- the editor must not become a dependency of runtime or build packages.

These rules keep the engine usable without the editor and keep document tooling
usable without a browser.

## Dynamic and compiled execution

The architecture supports two production paths.

Dynamic execution is appropriate for the editor, previews, remote UI, and
rapid iteration:

```text
UIDocument
    │
    ▼
@kurot/ui-runtime
    │
    ▼
Kurot component tree
```

Static compilation is appropriate when startup cost and the smallest runtime
surface matter:

```text
UIDocument
    │
    ▼
@kurot/cli
    │
    ▼
generated TypeScript/JavaScript factory
    │
    ▼
Kurot component tree
```

Static builds do not need to include the dynamic `@kurot/ui-runtime` document
walker. Both paths must consume the same component identities and property
contracts defined by `@kurot/ui-document`.

## Ownership checklist

When adding a feature, route it by responsibility:

| Question | Owner |
| --- | --- |
| How is it drawn? | `@kurot/core` |
| How does the component measure, lay out, or react? | `@kurot/ui` |
| How is the feature represented and validated as data? | `@kurot/ui-document` |
| How is that data converted into running objects? | `@kurot/ui-runtime` |
| How is it converted or compiled during a build? | `@kurot/cli` |
| How does a user manipulate and preview it? | Future UI Editor |

If a feature answers more than one question, split its semantic contract from
its runtime implementation instead of introducing a reverse dependency.
