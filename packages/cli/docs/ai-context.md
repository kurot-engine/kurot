# @kurot/cli — AI context map

Read this before exploring `src/`. [`architecture.md`](./architecture.md)
explains the plugin pipeline. The package is published as `@kurot/cli@3.3.1`, runs on Node.js 20+,
and is installed as a project dev dependency.

## Directory map

```text
src/
├── index.ts                       Commander entry
├── define.ts                      public configuration type exports
├── commands/                      build, dev, create, clean
├── core/
│   ├── config.ts                  configuration loading and validation
│   ├── project.ts                 resolved paths, dependencies, namespaces
│   ├── pipeline.ts                BuildContext and ordered plugin runner
│   ├── dev-server.ts              static server and watchers
│   ├── resource-watcher.ts        recursive resource + shallow parent watch/reconnect
│   ├── resource-asset-sync.ts     content comparison, staged writes and deletion reconciliation
│   ├── diagnostics/               stable codes and JSON/JSONL output
│   ├── components/                reusable component discovery
│   ├── kui/                       UIDocument → SkinIR → ESM compiler
│   └── plugins/                   build stages
└── utils/
```

Project templates are under `templates/game` and `templates/empty`.
The 3.2.1 game template includes fixed style/locale configuration,
English properties and licensed regular/bold font files. StyleManager finishes
font loading before Main creates Player/Preloader; LocaleManager registers
preload texts before creating the scene. See [game-template.md](game-template.md).
Version 3.3.0 is published with Label preset compilation and
published ui-document 0.11.0. It has no local document-kernel override.
Published version 3.3.1 adds whole-resource dev synchronization, deletion/reconnect
handling and no-store responses. Installed CLI 3.3.0 lacks these fixes; consumers
must update their installed/locked version to receive them.

## KUI compilation

`.kui.xml` is the only authored UI format. `compile-kui.ts` recursively scans
`ui.sourceDir` and parses every document with `@kurot/ui-document`. Appearance
assets are adapted by `kui/kui-parser.ts` to the compiler-private `SkinIR`,
then `skin-module-builder.ts` bundles generated factories.

A Skin document root declares `class`, the generated skin registration name,
and may declare `states`. The Skin is the visual root container: its properties
and layout apply to the runtime Skin, and its direct visual children become
`skin.elementsContent` without an extra Group. Overrides use local
`property.state` attributes. Storage IDs and runtime mapping metadata are not
authored XML fields.

CLI 3.3.1 requires `@kurot/ui-document@^0.11.0`. Schema-defined strings, including
numeric/boolean-looking text and state text, are literal attributes without
backslash type escaping. Old synthetic prefixes become literal characters;
do not migrate them silently. Numeric/boolean properties and schema-free
collection fields retain their existing rules.

The theme JSON at `resource/default.thm.json` is fixed generated output. It is
derived from built-in naming conventions and configured project component
pairs, and contains `skins` plus `skinsJs`; it is never read as an authored
input. Duplicate conventional mappings are errors.

`SkinIR` is intentionally smaller than `UIDocument`. It contains resolved
runtime classes, assignments, visual children, layout descriptor children,
and state `SetProperty` overrides. Reuse, data contracts, actions, and editor
transactions stay in `@kurot/ui-document` and `@kurot/ui-runtime`.

Successful compilation writes `.kurot/skin-parts.d.ts` from the same IR. Every
explicitly identified node inside the Skin is a skin part, with its `id`
as the part name. Internal nodes can omit `id`; the declaration augments
`SkinPartsMap` and narrows matching exported
component classes. The file is development metadata and is excluded from
runtime output.

## Reusable components

With `ui.components`, `<Name>.ts` under `sourceDir` pairs with
`<Name>Skin.kui.xml` at the same relative path under `skinDir`. The source must
export `<Name>`; the paired Skin supplies its own `class`. Discovery creates the
namespace entry, skin association, and development component catalog. Component
names must be unique inside the configured namespace.

Manual `ui.namespaces` entries remain available for project barrel files. A
manual prefix cannot conflict with `ui.components.namespace`.

## Non-obvious behavior

- `--watch` uses development mode even when `--release` is also supplied.
- Real KUI parse or code-generation failures abort the current build. Dev watch
  keeps the last successful bundle and retries on the next edit.
- Unknown KUI tags are warnings in normal development, and errors under
  `--strict` or release policy.
- Machine diagnostic modes own stdout: build emits one JSON result; dev emits
  JSONL lifecycle events.
- Since 3.3.1, dev watches all resource assets even without UI, emits
  resource-change for copy-only batches, retains KUI requirements across mixed
  batches, and reconciles deletions. Browser refresh remains manual; HTTP is
  no-store. Per-file staging/rename is not an atomic atlas pair transaction.
  Read [dev resource watching](dev-resource-watching.md) for the exact boundaries.
- `compileCustomNamespaces` must precede `compileSource`. Application-relative
  imports and generated `#ns/<prefix>` imports must resolve to one bundled class
  identity.
- Engine and custom namespace chunks share `ctx.outputs.engine` because the
  import-map writer treats both as external specifier mappings.
- Release bundles preserve class names. UI theme fallback uses constructor
  names, so normal identifier minification would break skin lookup.
- The Skin module builder stages output in a temporary directory and installs a
  bundle only after every Skin succeeds.
- `cleanOutput` wipes the active output directory at the start of each build.
  The standalone `clean` command removes both development and release output.
- `create` queries the npm registry for current Kurot package versions and falls
  back to `latest` if the request fails.
- Release output is timestamped and `manifest.json` exists only in release.

## Plugin order

`defaultPlugins()` currently runs:

1. clean output;
2. compile KUI;
3. compile engine packages;
4. compile project namespaces;
5. write the development component catalog;
6. compile application source;
7. generate HTML;
8. write the release manifest;
9. copy runtime assets.

Do not reorder namespace or source compilation without reviewing externalization
in `namespace-external-plugin.ts`.

## Configuration lookup

| Task                             | File                                                                |
| -------------------------------- | ------------------------------------------------------------------- |
| Add or validate a config field   | `src/core/config.ts`                                                |
| Resolve an absolute project path | `src/core/project.ts`                                               |
| Change KUI scanning/theme output | `src/core/plugins/compile-kui.ts`                                   |
| Change KUI node code generation  | `src/core/kui/kui-parser.ts`, `codegen.ts`                          |
| Add a built-in component tag     | `src/core/kui/registry.ts`                                          |
| Change generated part types      | `src/core/kui/skin-parts-declaration.ts`                            |
| Change component pairing         | `src/core/components/discover-components.ts`                        |
| Change watch behavior            | `src/core/dev-server.ts`                                            |
| Change output HTML/import maps   | `src/core/plugins/generate-html.ts`                                 |
| Change scaffolding               | `src/core/template.ts`, `templates/`                                |
| Change project style/locale boot | `templates/game/src/StyleManager.ts`, `LocaleManager.ts`, `Main.ts` |
| Add a diagnostic code            | `src/core/diagnostics/codes.ts`                                     |

## Verification

Run commands from this package directory:

```bash
pnpm build
pnpm test
```

CLI end-to-end tests bind localhost and may require permission in a restricted
execution environment.

## Resource configuration change in 3.0.0

KUI builds validate object subkeys, resolve resource nine-slice defaults, and
watch the manifest during development. See
[the resource-default contract](../../ui-document/docs/resource-nine-slice.md)
for conversion and compilation boundaries.

## Label text compilation in 3.1.0

The compiler consumes the shared ui-document catalog and emits Label `textFit`,
`minFontSize`, authored `size` and state-size overrides unchanged. Runtime
observations are not authoring inputs, and fitting never becomes a build-time
measurement. Rendering uses the application's UI >= 3.1.0 and Core >= 2.1.0
within their respective majors. Neither engine is a CLI runtime dependency.
See [text compilation](label-text-layout.md) and
[native Label text layout](../../ui/docs/label-text-layout.md) for the boundary.

## Project styles in 3.2.0

Read [project styles](../../ui-document/docs/project-styles.md). buildSkinsModule
reads the optional fixed config/style.json once per build and forwards its numeric
colors to parseKUISkin before IR conversion. The resource watcher also observes
config/style.json; missing referenced colors fail with the Skin path and property.
Base and state colors use @style:colors:<key>; reject the previous color prefix
without migrating files. Fonts are validated but not loaded; the application owns
font loading and rendering. Build/preview copies resolve references while authored
XML retains them. No live runtime palette switching is introduced.

## Label presets in 3.3.0

skin-module-builder.ts reads the entire stylesheet once per build and passes it
through parseToIR/parseKUISkin. Resolve resource defaults, then Label presets, then colors before
native emission; retain XML references and local/state precedence. compileKUI
accepts an optional styleSheet. style.json changes already trigger whole-Skin
rebuilds. Invalid presets retain the last successful bundle. The dependency and
lockfile use published ui-document 0.11.0 without a local override. textStyle is
Default-only; individual named-state fields can still override preset properties.
