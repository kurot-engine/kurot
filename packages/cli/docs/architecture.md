# CLI architecture

`@kurot/cli` is a project-local Node.js tool. Commander owns the command layer,
esbuild owns TypeScript and bundle output, and ordered `BuildPlugin` instances
share a `BuildContext` through `core/pipeline.ts`.

## Build pipeline

`defaultPlugins()` runs these stages:

```text
clean output
  → compile KUI
  → compile engine packages
  → compile custom namespaces
  → write development component catalog
  → compile application source
  → generate HTML
  → write release manifest
  → copy runtime assets
```

KUI compilation runs first because skin factories can import project namespace
components. Namespace and engine chunks are externalized consistently so the
application, UI runtime, and generated skins share one class identity.

## KUI boundary

The CLI does not define a second UI document format. It parses `.kui.xml`
through `@kurot/ui-document`, then adapts appearance documents to the private
`SkinIR` used by the ESM code generator:

```text
KUI XML → UIDocument → SkinIR → skin factory → theme bundle
```

`SkinIR` contains runtime code-generation details only: resolved imports,
factory variables, property assignments, semantic layout children, and state
property overrides. Document contracts, reusable instances, data bindings, and
actions remain `UIDocument` concepts.

The authored `Skin` root supplies its generated `class` and optional state
names. State values live on their target nodes as `property.state`. The compiler
derives the theme map from built-in naming conventions and configured project
component pairs, and rejects duplicate conventional mappings. The generated
theme JSON is an output artifact, never an authored source.

## Output ownership

`BuildContext.outputs` carries generated filenames between plugins. Important
entries include the application entry, theme script, namespace chunks, engine
chunks, and `.kurot/skin-parts.d.ts`.

Development builds preserve application source module structure under
`bin-debug/`. Release builds create a timestamped directory under
`bin-release/web/`, minify bundles, add content hashes, and write
`manifest.json`. Static resources retain stable paths because application code
addresses them by key or URL.

## Development watchers

The dev server has separate rebuild paths for application source, KUI XML, and
convention-based reusable components. A component change can affect its source
namespace, paired skin, generated type declaration, and editor catalog, so that
path refreshes all four outputs as one operation. The server preserves the last
successful output after an invalid edit.

## Diagnostics

Plugins report stable diagnostics to the collector rather than throwing on the
first recoverable problem. Strict policy promotes supported warnings. Build
JSON emits one final result; dev JSONL emits lifecycle events suitable for a
long-running editor or agent process.

## Main source areas

```text
src/core/config.ts                 project configuration
src/core/project.ts                resolved project paths and namespaces
src/core/pipeline.ts               build context and plugin runner
src/core/kui/                      UIDocument-to-SkinIR compiler
src/core/components/               reusable component discovery
src/core/plugins/compile-kui.ts    KUI scan, theme derivation, bundle output
src/core/plugins/                  remaining ordered build stages
src/core/dev-server.ts             file watching and static server
```
