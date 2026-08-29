# @kurot/cli — AI context map

Read this before exploring `src/`. It is a compressed map so an agent
unfamiliar with Kurot does not need to re-derive the pipeline from scratch
each session. [`architecture.md`](./architecture.md) covers the same plugin
pipeline in greater detail.

Package identity: `@kurot/cli@1.1.3`. Node.js build tool, esbuild-powered,
with a built-in EXML → ESM compiler. Not installed globally — projects use it
via `npx` (scaffolding) or as a devDependency with npm scripts.

## 1. Directory map

```
src/
├── index.ts                       CLI entry (commander), registers 4 subcommands.
├── define.ts                      Pure type re-export (ProjectConfig etc.) for
│                                   kurot.config.ts authoring — no runtime logic.
├── commands/
│   ├── build.ts                   build: release/watch/strict + human/JSON diagnostics
│   ├── dev.ts                     dev: port/sourcemap/strict + human/JSONL diagnostics
│   ├── create.ts                  create: scaffolds a project from templates/
│   └── clean.ts                   clean: removes BOTH bin-debug and bin-release
├── core/
│   ├── config.ts                  loadConfig() — reads kurot.config.ts/js, merges DEFAULTS
│   ├── project.ts                 loadProject(mode) — resolves absolute paths, enginePackages,
│   │                              customNamespaces (#ns/<prefix> specifiers)
│   ├── pipeline.ts                BuildContext, runPipeline(), disposeContext()
│   ├── dev-server.ts               startDevServer — static file server + EXML file watcher
│   ├── namespace-external-plugin.ts  Shared esbuild plugin, see §2
│   ├── template.ts                 scaffoldProject(), TEMPLATES list
│   ├── errors.ts                   BuildError, ConfigError
│   ├── diagnostics/                Serializable diagnostics, strict policy, JSON/JSONL protocol
│   ├── components/                 Reusable TS/Skin discovery and refresh
│   ├── exml/                       The EXML → SkinIR → ESM compiler (see §3)
│   │   ├── xml-parser.ts           Hand-rolled recursive-descent XML parser
│   │   ├── registry.ts             Namespace prefix map + component tag registry
│   │   ├── exml-parser.ts          XElement tree -> SkinIR
│   │   └── codegen.ts              SkinIR -> ESM source text (string building, not AST)
│   └── plugins/                    Pipeline steps, run in array order (see §5)
│       ├── clean-output.ts, compile-exml.ts, compile-engine.ts,
│       │   compile-custom-namespaces.ts, component-catalog.ts, compile-source.ts,
│       │   generate-html.ts, manifest.ts, copy-assets.ts
│       └── index.ts                defaultPlugins() — the build-command order
└── utils/                          Misc helpers
```

Templates actually scaffolded by `create` live in `templates/game/` and
`templates/empty/` (sibling to `src/`, not under it) — see §6.

## 2. Non-obvious behavior

- **`--watch` silently forces development mode**, even if `--release` is also
  passed (with a warning) — there is no release watch mode.
- **Real Skin compilation failures abort both development and release builds.**
  Dev watch catches the failure at the watcher boundary, keeps the process and
  last successful Skin bundle alive, then retries after the next change. It
  never emits a stub factory returning `{}`.
- **Unknown EXML tags are intentionally recoverable only in normal mode.** They
  produce located `KUROT_EXML_UNKNOWN_TAG` warnings and are omitted from the
  generated tree. `--strict` and release policy promote them to errors.
- **Machine output owns stdout.** `build --diagnostics json` emits one result;
  `dev --diagnostics jsonl` emits one lifecycle event per line. Ordinary logger
  output is disabled so agents do not need to remove colors or status text.
- `xmlns:eui="http://ns.egret.com/eui"`-style URIs are **purely cosmetic**.
  Only the literal prefix string (`eui`) is ever inspected against
  `registry.ts`'s `NAMESPACE_MODULES` map — the URI value is never
  dereferenced, fetched, or validated. No network access happens for
  namespace resolution.
- **`compileCustomNamespaces` must run before `compileSource`** in the
  plugin array — `compileSource` reads `ctx.outputs.namespaceModules` to
  exclude namespace-owned files from per-file dev entries and to mark them
  external. This ordering is enforced only by comments/convention, not by
  types — swapping the array order would duplicate namespace classes into
  the app bundle with mismatched `instanceof` identity.
- `ctx.outputs.engine` is a **single shared map** holding both `@kurot/*`
  engine chunks AND `#ns/*` custom-namespace chunks — the import-map
  generator (`generate-html.ts`) doesn't distinguish between them.
- Release engine, namespace, and application bundles enable esbuild
  `keepNames`: `Component.hostComponentKey` and Theme inheritance fallback use
  `constructor.name`, so ordinary identifier minification would break default
  Skin lookup even though the ESM export name remained stable.
- `exml.components` is convention-based: `<Name>.ts` under `sourceDir` must
  pair with `<Name>Skin.exml` at the same relative path under `skinDir`.
  Component names are globally unique inside that namespace. The CLI generates
  the namespace entry, validates exact EXML tags, injects default Theme
  mappings, and writes `.kurot/component-catalog.json` in development only.
  The Skin remains a standard `eui:Skin`, so existing visual editors can edit it.
- A manual `exml.namespaces` barrel remains supported, but its exports are
  intentionally unknown until esbuild runs. Its prefix may not conflict with
  `exml.components.namespace`.
- `namespaceModuleExternalPlugin` (in `namespace-external-plugin.ts`) exists
  because a plain esbuild `external: [specifier]` list only catches literal
  `#ns/game`-style imports (what EXML-generated code emits) — it does NOT
  catch hand-written game code doing a relative import like
  `./ui/HeroNarrowIR.js` to the same file. Without this plugin, that file
  would get bundled twice with two different `instanceof` identities. It's
  applied in `compile-source.ts` and `compile-custom-namespaces.ts`, but
  deliberately **not** in `compile-exml.ts`'s skin bundler — generated skin
  code only ever imports via the virtual `#ns/*` specifier, never a relative
  path, so the plain `external:` list is sufficient there.
- `skin-module-builder.ts` generates every Skin module in a temporary staging
  directory and installs the completed bundle only after all Skin code has
  compiled. This is what preserves the previous bundle during failed watches.
- `parseValue()` in `exml-parser.ts` coerces EXML attribute values in this
  order: binding (`{...}`) → percent (trailing `%`) → boolean literal → `null`
  literal → numeric literal → fallback string. This means literal strings
  `"true"`, `"false"`, `"null"`, or any numeric-looking string (`"100"`)
  **always** become non-string JS values in generated code — there is no
  escape hatch to force them through as literal text. Fallback strings decode
  Egret-style `\n` sequences into hard line breaks; this is independent of a
  Label's `multiline`/automatic-wrapping behavior.
- `copy-assets.ts` unconditionally skips copying the theme file and all
  `.exml` files whenever `exml` config is present, **regardless of whether
  `compile-exml.ts` actually found/compiled anything**. A misconfigured
  `exml.themeFile` pointing at a real theme with zero matching `.exml` files
  silently drops the theme JSON from the output entirely — no error, no
  theme file in `bin-debug`/`bin-release`.
- `cleanOutput` (first step in `defaultPlugins()`) means **every dev build
  wipes `bin-debug/` first** — the build pipeline is never incremental at the
  output level (esbuild's own watch-mode incrementality happens upstream of
  this). Note `clean.ts` (the standalone command) additionally always removes
  `bin-release` too, regardless of what mode you're building in — cleaning
  is more aggressive than a single build's own output-dir wipe.
- `kurot create` makes **live npm registry HTTP calls** (3s timeout per
  package) to pin each scaffolded `@kurot/*` dependency to a concrete
  version, falling back to the literal string `'latest'` on failure/timeout.
  This is a real network dependency during scaffolding.
- `writeManifest` is a **no-op outside release mode** — `manifest.json` is
  only ever written for release builds.
- Release output path is timestamped (`bin-release/web/<YYMMDDHHmmss>/`) —
  every release build creates a brand-new folder, nothing is ever overwritten
  or incrementally updated.
- `compile-engine.ts` writes throwaway stub files (`export * from '<pkg>';`)
  into a temp dir **inside the project's own `node_modules`**
  (`node_modules/.kurot-engine-<random>/`) so esbuild's normal Node resolution
  can find the real package — always cleaned up in a `finally`.
  `skin-module-builder.ts` instead uses an OS temp dir
  (`os.tmpdir()/kurot-skins-*`) — the two compile steps intentionally use
  different temp-file strategies.

## 3. The EXML compiler internals (SkinIR pipeline)

Flow: `xml-parser.ts` (raw XML → `XElement`/`XText` tree) → `exml-parser.ts`
(`parseEXML`/`parseSkinRoot`, tree → `SkinIR`) → `codegen.ts`
(`generateCode(ir)`, `SkinIR` → ESM source text via string building, not an
AST-to-AST transform).

- **`registry.ts`** is the "component registry": `NAMESPACE_MODULES`
  (`{eui: '@kurot/ui', egret: '@kurot/core', w: '@kurot/ui', core:
  '@kurot/core'}`, prefix-keyed) and `COMPONENTS` (~40 entries mapping short
  tag names like `Button`/`Panel`/`List` to `{module, defaultProperty?,
  isArray?}`). `defaultProperty` is where direct child nodes get assigned —
  e.g. `Skin`/`Group`/`Panel` → `elementsContent` (array), `DataGroup`/
  `List`/`ComboBox` → `dataProvider` (single value). `lookupComponent()`
  checks custom namespaces first. Convention-discovered namespaces carry an
  exact component-name set, so misspelled `<game:...>` tags are rejected with
  suggestions. Manual `exml.namespaces` barrels remain open-ended because the
  parser does not introspect their exports.
- Root element must be locally named `Skin` (any prefix) or the parser
  throws. `states="a,b,c"` shorthand on the root expands into empty-override
  `StateDef`s. State collection is **two-pass**: pass 1 scans the whole tree
  (including inside `<eui:states>` wrappers) to pre-register every
  `<eui:State>`; pass 2 processes visual/property/`<Declarations>` children,
  skipping anything already claimed as a state.
- `includeIn`/`excludeFrom` attributes are converted into synthesized
  `AddItems` state overrides — nodes carrying either attribute are excluded
  from the default `elementsContent` list entirely and only appear via
  per-state `AddItems`.
- Unknown tags are dropped from the tree and retained as located records in
  `unresolvedTags`; normal builds warn, while strict/release builds fail.
  Duplicate `id` attributes on two nodes in the same skin **do** throw a hard
  error.
- Codegen: a node with an `id` gets both a local `const varName = new X()`
  **and** `skin.<id> = varName` — this is how skin parts become accessible
  on the `Skin` instance at runtime (`skin.skinParts` is emitted as a JSON
  array of id strings). A node with no `id` but state-specific properties
  still gets `skin.<varName> = varName` so `SetProperty` overrides can find
  it via `skin.getPart(varName)`.
- `scale9Grid="1,3,8,8"` (Egret comma-string encoding) is specifically
  detected and converted to `new Rectangle(1, 3, 8, 8)` in generated code —
  the only property with this special-cased conversion.
- Bindings: `{a.b.c}` → `Binding.bindProperty(this, ["a","b","c"], target,
  "prop")`; mixed template text (`"Hello {name}!"`) → `Binding.
  bindProperties(this, [...], [...], target, "prop")`. The generated factory
  code relies on `this` being bound by the runtime `Skin`/`Component`
  framework (in `@kurot/ui`, outside this package) when the factory is
  invoked — not the module scope. See `Component._invokeSkinFactory()` in
  `@kurot/ui` for the calling convention this depends on.

## 4. `skinsJs` runtime wiring

`buildSkinsModule` (in `compile-exml.ts`) bundles every compiled skin
factory into one ESM entry that, on import, does:
```js
globalThis["skins.ButtonSkin"] = createButtonSkin;
```
for each skin — **skins register themselves as global-keyed factories under
their full class name string**, they are not ES exports the app imports
directly. The theme JSON gets a `skinsJs` field added (POSIX-relative path
from the theme file's own directory to this bundle, e.g. `js/default.thm.js`)
— the runtime `Theme` class (in `@kurot/ui`, not this package) reads
`skinsJs`, dynamically imports that module (populating `globalThis` as a side
effect), then resolves each `skins` mapping entry against `globalThis` to get
the factory. The `skins` mapping itself accepts both Egret-style `.exml`
paths (resolved to the matching compiled skin's class name) and Kurot-style
class-name strings directly (passed through unchanged).

## 5. Pipeline step order

`defaultPlugins()` (used by `build`):
```
cleanOutput → compileExml → compileEngine → compileCustomNamespaces
→ compileSource → generateHtml → writeManifest → copyAssets
```

`dev-server.ts`'s list is **shorter** (no `cleanOutput`, no `writeManifest`):
```
compileExml → compileEngine → compileCustomNamespaces
→ compileSource → generateHtml → copyAssets
```

`runPipeline` iterates the array in order, logs each step name, and stops after
a plugin finishes if the diagnostic collector contains errors. Nothing in the
type system enforces the `compileCustomNamespaces`-before-`compileSource`
dependency; it remains convention + code comments.

`dev-server.ts` additionally runs its own EXML-only resource watcher: it
watches `project.resourceDir` recursively (only if `config.exml` is set),
debounced 100ms, and on any `.exml` change re-runs `compileExml().apply(ctx)`
+ `copyAssets().apply(ctx)` **directly, bypassing `runPipeline`** (no "step"
log format, and it skips `compileSource`/`generateHtml`). If
`fs.watch({recursive:true})` isn't supported on the platform, it logs a
warning and disables EXML watching rather than crashing. App source
watching itself happens separately, inside `compileSource`'s own
`esbuild.context().watch()`.

## 6. `create` — what actually gets scaffolded

`scaffoldProject(name, template)`:
1. Copies `templates/<template>/` verbatim. Scaffolded file contents do not
   undergo placeholder substitution; HTML build templates are handled
   separately by `generate-html.ts`.
2. Rewrites `<name>/package.json`: sets `.name`; pins `@kurot/cli` to
   `^<version of the CLI binary currently running>`; re-resolves every other
   `@kurot/*` dependency against the npm registry `latest` tag (3s timeout,
   falls back to the literal string `'latest'` on failure).

Confirmed file lists (from directory listing, not the README):
- **`templates/game/`**: `kurot.config.ts`, `package.json`,
  `pnpm-workspace.yaml`, `tsconfig.json`,
  `resource/{default.res.json, default.thm.json, assets/{eui.json, eui.png},
  skins/*.exml}` (21 skin files), `src/{Main.ts, LoadingUI.ts}`,
  `template/web/{index.html, logo.png}`.
- **`templates/empty/`**: `kurot.config.ts`, `package.json`,
  `pnpm-workspace.yaml`, `tsconfig.json`, `src/Main.ts`,
  `template/web/index.html`. **No `resource/` directory at all** and no
  `exml` key in its `kurot.config.ts`.
- Both templates' `pnpm-workspace.yaml` set `allowBuilds: {esbuild: true}`
  and `minimumReleaseAge: 0` — a pnpm supply-chain-safety config baked into
  every new project.
- `game/src/Main.ts`'s lifecycle is `createChildren → runGame →
  loadResource → installResourceAssetAdapter → loadTheme → createGameScene →
  startAnimation`. `installResourceAssetAdapter` is a private step between `loadResource` and
  `loadTheme` that swaps in a custom `AssetAdapter` so EXML `source=
  "button_up_png"`-style references resolve against the preloaded resource
  group before falling back to `DefaultAssetAdapter`.
- Generated project comments (`LoadingUI.ts`, `Main.ts`) are in Simplified
  Chinese, consistent with this package's own docs.

## 7. Published package surface

The `kurot` executable is the command entry. The package's JavaScript/TypeScript
entry is `dist/define.js` / `dist/define.d.ts`, generated from `src/define.ts`.
It exports configuration types only: `ProjectConfig`, `BuildTarget`,
`StageConfig`, `ExmlConfig`, `ComponentsConfig`, and `OutputConfig`. CLI pipeline, EXML and
diagnostic internals are not package subpath exports.

## 8. Task → file map

| I want to... | Look at |
|---|---|
| Add a new EXML tag / component mapping | `core/exml/registry.ts` (`COMPONENTS`) |
| Change reusable-component pairing/catalog behavior | `core/components/discover-components.ts`, `core/plugins/component-catalog.ts` |
| Change how skin factories are generated or bundled | `core/exml/codegen.ts`, `core/exml/skin-module-builder.ts` |
| Debug why a namespace class is duplicated (`instanceof` breaks) | `core/namespace-external-plugin.ts`, confirm `compileCustomNamespaces` ran before `compileSource` |
| Add a new build pipeline step | `core/plugins/`, register it in `core/plugins/index.ts`'s `defaultPlugins()` (and `dev-server.ts`'s list if it should also run in dev) |
| Change the HTML template placeholder contract | `core/plugins/generate-html.ts` (`PLACEHOLDERS`) |
| Change strict promotion or machine diagnostic output | `core/diagnostics/`, `commands/build.ts`, `commands/dev.ts` |
| Debug EXML failure recovery in dev | `core/exml/skin-module-builder.ts`, `core/dev-server.ts` |
| Change what `kurot create` scaffolds | `templates/game/` or `templates/empty/`, plus `core/template.ts` for the package.json rewrite logic |
