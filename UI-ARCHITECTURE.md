# Kurot UI Authoring Architecture

This document defines the intended UI authoring architecture for Kurot. It is
the source of truth for how editable UI assets, the future visual editor,
Agent-assisted authoring, runtime preview, reusable components, skins, and
production compilation fit together.

The objective is not to replace one markup syntax with another. The objective
is a durable collaboration loop in which a person can describe a large change
in natural language, an Agent can produce a safe semantic edit, and the person
can immediately inspect, adjust, undo, and continue that work in a visual
editor.

The shortest description is:

```text
natural language + visual editing
                │
                ▼
       semantic edit operations
                │
                ▼
       editable Kurot UI assets
          │             │
          ▼             ▼
  runtime preview    CLI compilation
          │             │
          ▼             ▼
   live Kurot UI    generated TS/JS
```

## 1. Non-negotiable principles

### 1.1 UI remains an editable asset

A screen, reusable component, or visual skin remains an editable source asset
throughout development. Generated TypeScript or JavaScript is a build artifact,
not the authoring source and not something the editor must reverse-engineer.

```text
editable UI asset  ──compile──>  generated factory  ──bundle──>  game
       ▲
       └── human and Agent continue editing this source
```

The production bundle may omit authoring files, but the project repository must
retain them.

### 1.2 Human and Agent edit the same model

There must not be a separate "AI version" of a UI. Dragging a component in the
editor and asking an Agent to move it both produce changes to the same semantic
document.

### 1.3 The Agent edits semantics, not generated code

The preferred Agent output is a validated transaction of semantic operations,
not an unrestricted rewrite of a markup file and not generated component code.
This preserves unrelated human work, supports review and undo, and gives errors
an exact node and property path.

### 1.4 The authoring model is not EXML 2.0

The future model must not inherit EXML namespaces, reflection rules, global
component exports, stringly typed attributes, or EUI-specific skin lookup merely
for compatibility. Existing EXML support remains an independent current
workflow until the new workflow is ready; it does not constrain the new model.

### 1.5 Serialization syntax is not the semantic model

`UIDocument` is the normalized in-memory meaning of an asset. XML, JSON, or a
future `.kui` syntax may serialize that meaning. The editor, runtime, Agent
tools, and compiler must depend on the semantic model rather than a particular
text syntax.

### 1.6 Preview and production share contracts

Dynamic preview and static compilation must consume the same component keys,
property definitions, resource references, states, and reuse semantics. An
editor-only interpretation that differs from production is unacceptable.

## 2. Terminology

The exact public type names remain subject to design, but the concepts are
distinct.

| Term | Meaning |
| --- | --- |
| UI document | Normalized semantic representation of one editable UI asset. |
| Screen | A top-level page or game view such as a lobby, slot game, or crash game screen. |
| Reusable component | A project-defined UI composition that can be instantiated by other documents. Comparable to a prefab or FairyGUI component. |
| Component instance | A reference to a reusable component plus local property, slot, or variant overrides. |
| Skin / appearance | Editable visual structure and state presentation for a control or reusable component. |
| Runtime component | A real `@kurot/ui` object such as `Group`, `Label`, or `Button`. |
| Component schema | Runtime-independent description of a component's properties, children, constraints, and authoring guidance. |
| Edit operation | One semantic mutation such as creating a node or setting a property. |
| Transaction | An ordered, atomic group of edit operations with one undo boundary. |
| Generated factory | Build output that constructs the same runtime tree without dynamically walking the authoring document. |

"Skin" remains a useful concept, but not every editable UI asset is a skin. A
screen and a reusable inventory row are compositions; a button's normal,
pressed, selected, and disabled visuals are an appearance or skin.

## 3. Current position

Kurot has completed the lower semantic-to-runtime proof and the version 2
reusable authoring-asset model, not the full editor or production pipeline.

### 3.1 Implemented

`@kurot/ui-document@0.3.5` currently provides:

- runtime-independent `UIDocument`, `UINode`, and serializable property values;
- stable document and node identifiers;
- deterministic traversal, lookup, JSON parsing, and JSON serialization;
- structural validation with stable diagnostics and exact paths;
- component definitions, property definitions, inheritance, and deterministic
  registry resolution;
- an audited foundation catalog for `kui.Group`, `kui.Label`,
  `kui.EditableText`, `kui.Image`, `kui.Rect`, `kui.Button`,
  `kui.ToggleButton`, `kui.ProgressBar`, and `kui.TextInput`;
- screen, reusable-component, and appearance asset kinds;
- public contracts containing typed parameters, parts, Slots, states, and
  variants;
- compact component instances that retain references and local differences
  without expanding the source hierarchy;
- typed project resources and design tokens;
- project-wide reference, contract, identity, and dependency-cycle validation;
- golden conformance fixtures for a component, an appearance, and a screen
  containing two instances;
- semantic operations, atomic transactions, monotonic revisions, deterministic
  diffs, and undo/redo history;
- explicit parameter-to-internal-property bindings.

`@kurot/ui-runtime@0.2.3` currently provides:

- validation before materialization;
- deterministic construction of the nine audited foundation components,
  including the application-facing `TextInput` and its low-level
  `EditableText` appearance part;
- application of audited display, layout, text, image, rectangle, and button
  properties;
- Basic, horizontal, vertical, and tile layout descriptors;
- nine-slice rectangle conversion;
- recursive child construction;
- custom component adapters;
- stable node-ID-to-runtime-instance lookup;
- reusable component expansion with bound parameters, selected variants,
  public-part overrides, and projected Slot content;
- design-token resolution and an application resource-resolution hook;
- appearance assets installed as native Kurot skins and states;
- native TextInput appearance-part binding, prompt states, focus, and browser
  text entry;
- selected appearance variants applied before native state overrides;
- per-instance reusable-component state controllers with atomic restoration;
- structured runtime errors;
- a real browser preview proving that a semantic document becomes a rendered
  Kurot display tree.

The existing `@kurot/ui` package already owns the real UI behavior: measurement,
layout, validation, skins, states, bindings, collections, themes, and controls.
The existing CLI still compiles EXML for current projects.

### 3.2 Not implemented

The following are still design or implementation work:

- data binding and event/action semantics;
- incremental runtime reconciliation after an edit;
- a visual editor shell;
- Agent tools and context assembly;
- static `UIDocument`-to-TypeScript/JavaScript compilation;
- a final persisted `.kui` syntax and migrations.

### 3.3 Honest interpretation

The current `@kurot/ui-runtime` constructs a validated project asset
graph as real Kurot components. Its completed boundary is:

```text
UIAssetRegistry + root UIDocument → validated reusable component tree
```

This now proves the document-to-runtime seam, but it is still full-tree
materialization rather than live reconciliation. Binding, actions, transitions,
editor interaction, and production compilation remain future work. It does not
replace EXML in existing projects today.

| Capability | Status | Evidence / missing boundary |
| --- | --- | --- |
| Basic semantic tree | Implemented | Versioned documents, stable node IDs, validation, traversal, deterministic JSON. |
| Foundation component schema | Partial | Eight components are audited; the full authoring catalog and structured schemas are incomplete. |
| Semantic-to-runtime materialization | Implemented for the first slice | Real components, reusable instances, properties, layouts, Slots, adapters, errors, tests, and browser preview. |
| Editable asset kinds and reuse | Implemented for creation and states | Screens, components, compact instances, parameter bindings, parts, Slots, component variants/states, cross-document validation, runtime expansion, and golden fixtures. |
| Appearance, states, bindings, resources | Partial | Native appearance skins/states, selected variants, and design tokens execute at runtime; typed resources have an application resolver hook. Bindings, actions, transitions, and concrete resource adapters remain pending. |
| Editing operations and history | Implemented | Typed semantic operations, atomic transactions, expected revisions, inverse operations, deterministic diffs, and monotonic undo/redo history. |
| Visual editor | Not started | The current preview is a developer smoke page, not an editor. |
| Agent collaboration | Not started | Schemas exist, but there is no editing tool protocol or context coordinator. |
| Static UI compiler | Not started | The CLI still compiles EXML; it does not compile the new semantic assets. |

## 4. Target collaboration workflow

### 4.1 Creating a new screen

```text
Person: "Create a slot game screen with a balance bar, five reels,
         a bet selector, and a large spin button."
                            │
                            ▼
Editor assembles bounded context
  - available component schemas
  - project reusable components
  - resources, fonts, Spine assets, and design tokens
  - target viewport and safe-area rules
  - project naming and layout conventions
                            │
                            ▼
Agent proposes one transaction
  - create nodes and component instances
  - set typed properties and constraints
  - reference existing assets
  - assign stable IDs
                            │
                            ▼
Headless validation
  - schema and property validation
  - child and reference validation
  - resource and reuse validation
  - layout and state validation
                            │
                            ▼
Editor presents change summary and preview
                            │
                            ▼
Person accepts, adjusts visually, or asks for another change
```

### 4.2 Modifying existing work

For later requests, the Agent should normally emit a patch rather than replace
the whole document:

```text
Person: "Move the balance to the top right and make the spin button wider."

Transaction
├── setProperty(balanceBar, right, 24)
├── unsetProperty(balanceBar, left)
├── setLayoutConstraint(balanceBar, top, safeArea.top, offset: 16)
└── setProperty(spinButton, width, 280)
```

Unrelated nodes and manual adjustments remain untouched. The transaction is one
reviewable and undoable history entry.

### 4.3 Human intervention

The visual editor translates direct manipulation into the same operation
protocol:

```text
drag node             → setProperty / setLayoutConstraint
resize handle         → setProperty / setInstanceOverride
hierarchy reorder     → moveNode
delete key            → removeNode
property inspector    → setProperty / unsetProperty
component insertion   → instantiateComponent
state editor          → addState / setStateOverride
```

Natural-language editing and visual editing therefore converge before touching
the document.

## 5. Editable asset model

The semantic model should support several authoring asset kinds while sharing
one node and property foundation. The following shape is conceptual, not a
frozen TypeScript API.

```text
UIAsset
├── identity and format version
├── kind: screen | component | appearance
├── root composition or appearance template
├── parameters and exposed parts
├── variants and states
├── resource references
├── component dependencies
└── editor metadata that does not affect runtime semantics
```

### 5.1 Screen documents

A screen composes runtime and reusable project components into a top-level view.
It may expose named parts to handwritten game logic but should not contain
arbitrary TypeScript.

Examples include:

- `LobbyScreen`;
- `SlotGameScreen`;
- `CrashGameScreen`;
- `PaytableDialog`.

### 5.2 Reusable component documents

A reusable component owns an internal hierarchy and a stable public contract.
That contract may include:

- typed parameters;
- exposed parts;
- named slots for caller content;
- supported variants;
- emitted semantic actions or events;
- default size and layout behavior.

An instance stores a reference plus differences from the definition. It must not
copy the complete component subtree into every parent document.

```text
BalanceBar definition
├── icon
├── valueLabel
└── currencyLabel

SlotGameScreen
└── BalanceBar instance
    ├── parameter.currency = "USD"
    └── override.right = 24
```

Definition changes propagate to instances unless an instance explicitly
overrides the affected value. Overrides must remain inspectable and removable.

### 5.3 Appearance and skin documents

An appearance describes visual composition and state presentation without
becoming a second behavior class. It should support concepts such as:

- stable parts consumed by a control contract;
- normal, pressed, selected, focused, and disabled states where applicable;
- property overrides per state;
- transition and animation references;
- variants such as primary, secondary, compact, or dangerous;
- design-token and resource references.

The target model must define these concepts directly. It must not expose
`hostComponentKey`, reflective EUI part discovery, or `skinName` string lookup as
the authoring foundation. Runtime adapters may translate the new semantics to
current `@kurot/ui` mechanisms during migration.

### 5.4 Resources and design tokens

Documents should refer to stable project resource keys rather than raw runtime
objects. The editor context should distinguish at least:

- images and sprite-sheet regions;
- fonts;
- Spine assets;
- MovieClip or animation assets;
- colors, spacing, typography, and other design tokens;
- reusable UI documents.

The Schema must describe which resource category a property accepts. Agents
must select from the project catalog instead of inventing plausible file names.

### 5.5 Behavior boundary

Authoring assets describe structure, presentation, binding, and declarative
actions. Complex game logic remains handwritten TypeScript.

A document may expose a semantic action such as `spinRequested` or bind a label
to a declared view-model field. It must not embed unrestricted JavaScript
expressions. Slot, crash, RPG, and SLG protocol integration should use bounded,
typed contracts defined separately from visual composition.

## 6. Component and property schema

The component registry is the shared vocabulary of the editor, Agent, runtime,
and compiler. Every exposed component should provide enough information to use
it without reading implementation source.

A complete definition eventually needs:

- canonical component key and display name;
- purpose and usage guidance;
- inheritance or capability composition;
- child and slot policies;
- typed properties, defaults, ranges, enums, and units;
- resource and reference categories;
- layout participation and sizing behavior;
- exposed parts, actions, states, and variants;
- constraints between properties;
- short valid examples and common invalid uses;
- runtime factory and compilation mapping outside the headless schema package.

The authoring catalog must be curated rather than generated mechanically from
all public runtime getters. Read-only objects, internal caches, implementation
switches, and compatibility-only fields are not automatically authoring APIs.

## 7. Semantic edit protocol

The edit protocol is the most important AI collaboration boundary. The exact
names are not frozen, but the first complete set should cover:

### 7.1 Structural operations

- create a node;
- remove a node or subtree;
- move a node within or across parents;
- reorder children;
- duplicate a subtree with new stable IDs;
- replace a node type under explicit compatibility rules.

### 7.2 Property operations

- set or unset a property;
- set a layout constraint;
- assign or clear a resource reference;
- apply or remove a design-token reference;
- set a property for a named state or variant.

### 7.3 Reuse operations

- instantiate a reusable component;
- assign a parameter;
- fill or clear a slot;
- create or remove an instance override;
- detach an instance only through an explicit destructive conversion.

### 7.4 Document-level operations

- create, rename, and remove a state or variant;
- expose or hide a part;
- define or remove a parameter;
- add or remove a declared binding or semantic action;
- change asset metadata.

### 7.5 Transaction contract

Every Agent request and meaningful editor gesture should execute as a
transaction containing:

- a unique transaction ID;
- the expected document revision;
- an ordered operation list;
- a human-readable intent summary;
- validation diagnostics;
- inverse operations or an equivalent undo snapshot;
- the resulting revision when committed.

Application is atomic: either all operations validate and commit, or none do.
Revision checks prevent a delayed Agent response from silently overwriting work
performed after its context was captured.

## 8. Agent contract

An Agent cannot create reliable UI from component names alone. Before editing,
the editor must provide a bounded authoring context.

### 8.1 Required context

- relevant current documents and selected nodes;
- resolved component schemas;
- reusable project components and their public contracts;
- available resources and design tokens;
- target viewport, orientation, safe areas, and scaling policy;
- project conventions and approved examples;
- diagnostics already present in the document;
- the current document revision.

The complete engine source should not be required for ordinary UI generation.
Source remains available for engine development and exceptional diagnosis, but
the Schema and authoring contracts must be sufficient for routine Agent work.

### 8.2 Preferred output

For a new empty asset, an Agent may propose a complete initial transaction. For
existing assets, it should return semantic operations against stable IDs. It
should not directly edit generated factories.

### 8.3 Validation and repair loop

```text
Agent proposal
    ↓
structural + schema + reference validation
    ├── valid   → preview and present for review
    └── invalid → return bounded diagnostics to the Agent
                      ↓
                 repaired transaction
```

The Agent receives errors such as "property `gap` must be a finite number at
node `reelRow`" rather than a runtime stack trace. Repair attempts must remain
bounded and visible to the editor history.

### 8.4 Review experience

Before acceptance, the editor should be able to show:

- nodes created, removed, or moved;
- properties and overrides changed;
- resources introduced;
- before/after preview where useful;
- warnings and unresolved references;
- estimated scope, such as the number of affected nodes.

The person can accept the transaction, reject it, undo it later, or continue
editing manually.

## 9. Visual editor architecture

The future editor is a consumer and orchestrator of headless packages, not the
owner of a private UI format.

```text
Editor shell
├── Document store
├── Command and transaction engine
├── Hierarchy panel
├── Component palette
├── Property inspector
├── Resource browser
├── State / variant editor
├── Canvas preview host
├── Selection and transform overlay
├── History / diff panel
├── Diagnostics panel
└── Agent coordinator
```

### 9.1 Document store

Loads and saves authoring assets, tracks revisions and dirty state, and exposes
immutable snapshots to Agent requests and preview reconciliation.

### 9.2 Command engine

Is the only mutation path for visual gestures, property edits, and Agent
transactions. It owns validation, atomic commit, undo, redo, and change events.

### 9.3 Preview host

Owns Canvas and Stage lifecycle, viewport scaling, device presets, refresh,
runtime errors, and the bridge between node IDs and runtime instances. These
editor concerns do not belong in `@kurot/ui-runtime`.

### 9.4 Selection bridge

Maps hierarchy selection to `ui-runtime` instances, computes visual bounds, and
renders resize, anchor, alignment, and layout handles without mutating runtime
objects behind the document's back.

### 9.5 Agent coordinator

Assembles bounded context, invokes the selected model/provider, validates the
returned transaction, presents the diff, and feeds diagnostics into repair. It
does not define UI semantics itself.

## 10. Runtime preview and reconciliation

`@kurot/ui-runtime` is the execution layer used by the editor and optional
dynamic production features.

### 10.1 Current behavior

The current implementation validates and fully materializes a document:

```ts
const result = createKurotUI(document, options);
previewStage.addChild(result.root);
const selected = result.instances.get(selectedNodeId);
```

### 10.2 Required editor behavior

The first editor may rebuild the complete preview after a committed transaction
if document sizes remain small enough. The eventual runtime should reconcile
incremental changes:

- update a property on the existing instance when safe;
- add, remove, move, or reorder affected instances;
- rebuild an instance when its component type changes;
- refresh reusable instances when their definition changes;
- preserve editor selection where stable IDs survive;
- report exact operation and node paths on failure.

Incremental reconciliation is an optimization and interaction-quality feature;
it must not introduce semantics different from full materialization.

## 11. Serialization and file syntax

The persisted authoring syntax remains an open implementation decision. A
hierarchical XML-like `.kui` format may be concise for humans and Agents; JSON
is convenient for structured tools and transport. Either can be supported by a
format adapter.

The required guarantees are independent of syntax:

- lossless round-trip of all semantic data;
- deterministic output suitable for version control;
- stable node IDs and ordering;
- explicit format version;
- no executable expressions hidden in strings;
- forward migrations owned by `@kurot/ui-document`;
- editor metadata clearly separated from runtime semantics;
- generated factories never used as the editable source.

The current deterministic JSON API remains useful for testing, transport, and
early tooling. It does not settle the final human-facing `.kui` syntax.

## 12. Production compilation

Static compilation is the default target for ordinary game UI:

```text
editable Kurot UI assets
           ↓
      @kurot/cli
           ↓
generated typed factories
           ↓
        esbuild
           ↓
      production game
```

A generated factory may create real components directly:

```ts
export function createSlotGameScreen(): Group {
	const root = new Group();
	const spinButton = new Button();
	spinButton.label = 'Spin';
	root.addChild(spinButton);
	return root;
}
```

The actual generator should preserve stable part access, reusable component
factories, resource references, states, and source-map diagnostics. Generated
files are disposable and recreated from authoring assets.

Dynamic execution remains available for editor preview, remote activity UI,
hot-loaded content, and other cases where shipping a semantic document is a
feature:

```text
serialized UI asset → parse and validate → @kurot/ui-runtime → live tree
```

Static and dynamic paths must pass the same conformance fixtures before either
is considered production-ready.

## 13. Package ownership

| Package / layer | Owns | Must not own |
| --- | --- | --- |
| `@kurot/core` | Display tree, rendering, events, geometry, text, resources, media. | UI authoring semantics or editor behavior. |
| `@kurot/ui` | Runtime components, measurement, layout, control behavior, current skin and theme execution. | `UIDocument`, Agent schemas, editor transactions. |
| `@kurot/ui-document` | Semantic assets, schemas, validation, edit operations, transactions, revisions, serialization, migrations. | Runtime classes, DOM, Canvas, filesystem, model-provider calls. |
| `@kurot/ui-runtime` | Materialization, runtime adapters, instance lookup, eventual reconciliation. | Document syntax ownership, Canvas lifecycle, editor panels, component behavior. |
| `@kurot/cli` | Authoring-asset discovery, validation orchestration, static factory generation, build integration. | Live editor state or browser runtime execution. |
| Future editor | Visual editing, preview host, history UI, resource browsing, Agent orchestration. | A second private document model or renderer implementation. |

The dependency direction remains one-way:

```text
@kurot/ui-document ─────────────┐
                               ▼
@kurot/core → @kurot/ui → @kurot/ui-runtime
       │                       ▲
       └───────────────────────┘

@kurot/cli ──uses──> @kurot/ui-document

Future editor
├── @kurot/ui-document
└── @kurot/ui-runtime
```

`@kurot/ui-document` must remain headless. `@kurot/ui` must not depend on the
authoring packages. The editor must never become a production engine
dependency.

## 14. Delivery roadmap

The roadmap is ordered by dependency rather than visual appeal. Building an
editor shell before the mutation and reuse contracts are stable would create a
second accidental model inside editor code.

### Phase 0 — Semantic-to-runtime proof: completed

- foundation document and node model;
- validation and deterministic JSON;
- component registry and inherited property schemas;
- five audited foundation components;
- full runtime materialization and node-instance lookup;
- layouts, rectangle descriptors, structured errors;
- unit tests and browser preview.

This proves the lower boundary but is not yet an authoring workflow.

### Phase 1 — Format-v2 authoring model: completed

- define screen, reusable component, and appearance asset kinds;
- define component references and dependency identity;
- define instances, parameters, slots, parts, and overrides;
- define typed project resource references and design-token references;
- define runtime-neutral states and variants;
- audit compatibility-shaped properties such as `skinName` and
  `hostComponentKey` out of the canonical authoring surface;
- add cross-document validation and conformance fixtures.

Exit condition: a small reusable control and a screen containing two instances
can round-trip without expanding instance internals into the parent document.

Completion evidence: the `@kurot/ui-document` golden fixtures contain an
`ActionCard` component, a button appearance, and a lobby screen with two
`ActionCard` instances. Canonical round-trip and project validation pass while
the screen contains only asset references and local instance differences.

### Phase 2 — Headless editing kernel: completed

- define structural, property, reuse, and document operations;
- add atomic transactions and document revisions;
- add deterministic apply, inverse, diff, undo, and redo;
- add conflict diagnostics for stale revisions;
- add property and subtree query APIs needed by an editor;
- test operation sequences and round-trip invariants.

Exit condition: the same document can be built and modified entirely through
operations, with every transaction undoable and redoable.

Completion evidence: operation tests cover ordinary and Slot child collections,
properties, reusable-instance values, Contract entries, temporarily invalid
atomic sequences, stale revisions, inverse transactions, deterministic diffs,
and monotonic undo/redo.

### Phase 3 — Complete visual semantics

- complete the component catalog needed for a first production UI slice;
- add appearance transition semantics;
- define bounded binding and semantic-action contracts;
- implement concrete resource adapters for fonts, images, Spine, and animation;
- complete matching runtime adapters for the first production component slice.

The first slice should stay deliberately finite, such as the controls required
for one slot or crash-game screen, rather than attempting every possible game
UI component.

Exit condition: one representative screen can be represented without EXML-only
semantics or handwritten construction of its visual tree.

### Phase 4 — Preview reconciliation

- apply committed transactions to the live runtime tree;
- preserve stable instances and selection where possible;
- refresh component instances when a reusable definition changes;
- surface runtime diagnostics in document terms;
- maintain full-rebuild conformance as the reference behavior.

Exit condition: common property and hierarchy edits update an open preview
without reloading the editor page.

### Phase 5 — Minimum visual editor

- document open/save and revision tracking;
- hierarchy, component palette, property inspector, and resource browser;
- Canvas preview with selection and transform overlays;
- layout and constraint editing;
- history, diff, diagnostics, and device viewport presets;
- reusable-component navigation and instance-override inspection.

Exit condition: a person can construct, save, reopen, and visually modify the
representative screen without editing its serialized text.

### Phase 6 — Agent collaboration

- expose schemas, resources, reusable components, selection, and diagnostics as
  bounded context;
- expose the edit protocol as Agent tools;
- support new-document generation and local modification transactions;
- show semantic diffs before acceptance;
- feed validation failures into bounded repair attempts;
- add evals for preservation of unrelated work, valid resource use, layout
  intent, reuse, and undo safety.

Exit condition: a person can describe a large UI section, review the generated
transaction, adjust it visually, and ask for a second targeted modification
without the Agent overwriting manual changes.

### Phase 7 — Static compiler and production hardening

- compile authoring assets into typed component factories;
- generate stable part access and reusable factory calls;
- prove static/dynamic output conformance;
- integrate incremental CLI watch builds;
- add migrations, source diagnostics, dependency invalidation, and release
  gates;
- test representative devices and production project integration.

Exit condition: the representative screen ships without its authoring document
or dynamic document walker unless the project explicitly selects dynamic UI.

## 15. Decided and open questions

### Decided

- editable UI assets remain the development source of truth;
- generated TS/JS is a disposable production artifact;
- `UIDocument` is the normalized semantic model, not synonymous with JSON;
- human gestures and Agent requests use one edit protocol;
- stable IDs, typed schemas, validation, transactions, and undo are mandatory;
- reusable components use references and overrides rather than copied trees;
- the future model is not constrained by EXML compatibility;
- runtime preview and static compilation share semantic contracts;
- the initial supported game domain and component catalog remain finite.

### Open

- final `.kui` text syntax and file extension;
- whether appearances are always separate assets or may be embedded for small
  private components;
- exact parameter, slot, part, state, and variant TypeScript names;
- the bounded binding expression or view-model contract;
- how semantic actions connect to handwritten controllers;
- when full preview rebuild becomes incremental reconciliation;
- generated factory API and source-map format;
- editor packaging and process architecture.

Open questions must be resolved with small conformance examples and end-to-end
tests rather than by copying the shape of EXML, Unity, LayaAir, FairyGUI, or any
single existing editor.

## 16. Definition of architectural success

The architecture is successful when all of the following are true:

- a person can create and edit a screen visually without reading serialization;
- an Agent can generate a large valid section from natural language using only
  bounded schemas, resources, reusable components, and project context;
- the person can manually adjust the result and later Agent edits preserve
  those unrelated adjustments;
- every Agent change is reviewable, atomic, and undoable;
- reusable component definition changes propagate predictably to instances;
- invalid properties, resources, references, states, and bindings fail with
  exact semantic diagnostics;
- editor preview and compiled production output are structurally and visually
  conformant;
- the game can ship generated factories without authoring syntax parsers;
- `@kurot/core` and `@kurot/ui` remain usable without any editor or Agent
  dependency;
- no ordinary UI generation task requires the Agent to rediscover engine source
  code or guess private runtime behavior.

Until this loop exists, Kurot has semantic and runtime foundations for future UI
authoring, not yet an AI-native UI editor.
