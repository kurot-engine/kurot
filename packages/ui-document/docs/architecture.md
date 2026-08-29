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
