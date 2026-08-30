# UI Document Architecture

`@kurot/ui-document` is the shared semantic layer between UI producers and
consumers. It describes what a UI contains without depending on how it is
edited, stored externally, compiled, or rendered.

```text
Visual UI Builder ─┐
CLI / EXML Adapter ├─> UIDocument ─> validation / commands / serialization
Agent Adapter ─────┘                         │
                                            └─> runtime compiler or preview
```

## Model

A `UIDocument` contains one root `UINode`. Each node provides a stable ID, an
external component type key, explicit properties, and ordered children.

The initial format deliberately excludes runtime class instances, functions,
DOM objects, textures, and other process-owned resources. Future bindings and
resource references must be represented as explicit semantic records rather
than embedded runtime values.

## Identity

Document and node IDs are supplied by the caller; the package does not generate
random identifiers. This keeps Agent output, tests, diffs, and repeated builds
deterministic. Validation enforces document-wide node-ID uniqueness.

## Validation boundary

External JSON is `unknown` until it passes `validateUIDocument` or
`parseUIDocument`. Unknown node/document fields are rejected so misspellings
and unsupported Agent output remain visible as structured diagnostics.

Constructors make the normal programmatic path concise but do not replace
whole-document validation: only the validator can detect cross-tree invariants
such as duplicate IDs.

## Serialization

`serializeUIDocument` validates before writing, preserves child and array
order, and sorts property-object keys recursively. It therefore refuses to
silently convert non-finite numbers to JSON null or discard unsupported values.

Format adapters must translate to and from this model at their boundary. EXML
syntax, editor implementation details, and runtime object layout must not leak
into the core schema without an explicit semantic requirement.

## Component registry

`UIComponentRegistry` stores semantic component descriptions without importing
their runtime classes. A definition can describe known property value
categories and child policies, while `UINode.type` remains the stable link to
the external runtime or preview registry.

Registries are explicit instances rather than global state. A CLI build, editor
workspace, test, or Agent session can therefore assemble the exact catalog it
needs without leaking project-specific custom components into another session.

Definitions reject duplicate component keys and are copied and frozen when
registered. Listing is sorted by type so prompts and generated metadata remain
deterministic.

Concrete catalogs can be introduced gradually. Omitting `children` leaves the
child policy unvalidated; `allowUnknownProperties: true` preserves properties
that have not yet been described. Completed definitions should omit that flag
so property misspellings become diagnostics.

### Inheritance and resolution

Definitions may declare one `extends` type. Abstract definitions provide common
semantic properties and policies but component-aware validation rejects them
as `UINode.type` values.

`resolve(type)` walks the complete ancestor chain and returns a frozen
`UIResolvedComponentDefinition`:

- properties merge from the root base to the requested type;
- a derived property replaces the complete property definition with the same
  name;
- `children` and `allowUnknownProperties` use the nearest explicit value;
- `abstract`, `displayName`, and `description` describe only the requested type
  and are not inherited;
- `baseTypes` records ancestors from the root base to the direct base;
- resolved property keys use deterministic locale-independent string ordering.

Definitions can be registered in any order. Resolution caches only successful
results, and every later registration clears that cache. Missing bases and
inheritance cycles raise `UIComponentResolutionError`; component-aware document
validation converts those failures into structured diagnostics.
