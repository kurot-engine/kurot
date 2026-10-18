# Kurot game project

This starter demonstrates resource loading, styled KUI controls, translations
and Tween animation. Extend `src/Main.ts` with your game's rules and interaction.

## Run and build

Use Node.js 20+ and pnpm from this project directory:

```sh
pnpm install
pnpm dev
```

Open the URL printed by the server (default `http://localhost:3000`). Expect the
loading screen followed by the translated starter interface and animated text.
Refresh the browser manually after a successful rebuild.

```sh
pnpm build
pnpm release
```

Development output is `bin-debug/`; release output is
`bin-release/web/<timestamp>/`. Serve the generated directory over HTTP for
browser checks. `pnpm clean` removes both output trees.

The CLI transpiles with esbuild; a successful build does not establish complete
TypeScript type correctness or gameplay behavior. Check console errors, resource
requests and the intended interactions in the browser.

## Project map

- `src/Main.ts`: application startup and gameplay/UI composition. Preserve the
  existing font → Player → resources/theme → translations → scene ordering.
- `src/StyleManager.ts`, `LocaleManager.ts`, `AssetAdapter.ts`, `Preloader.ts`
  and `LifecycleHandler.ts`: startup services; consult them when changing their
  responsibility rather than reading all of them for every gameplay task.
- `resource/default.res.json`: resource manifest; `resource/config/`: fonts,
  colors and language settings; `resource/lang/`: translation text.
- `resource/ui/skins/`: editable default KUI skins. For reusable controls, pair
  `src/components/<Name>.ts` with
  `resource/ui/components/<Name>Skin.kui.xml`; export the matching class name.
- `kurot.config.ts`: build/stage/component settings; `template/web/index.html`:
  authored HTML. Keep explicit createPlayer options consistent with stage intent.
- `bin-debug/`, `bin-release/`, `.kurot/` and generated theme JSON: build outputs.
  Edit authored inputs; the CLI generates the Skin module and part declarations.

## Read only what the task needs

For gameplay, use Core's `docs/game-authoring.md` when available. In an engine
checkout, it links `examples/star-catcher`, a complete game with `pnpm check`.
Both are unreleased additions; published Core 2.5.4 does not contain the guide,
so use installed README/types as the fallback.

After installation, choose the relevant guide:

| Task | Installed documentation |
| --- | --- |
| Startup, display and input APIs | [Core README](node_modules/@kurot/core/README.md) |
| Resource loading | [Resource guide](node_modules/@kurot/core/docs/resource.md) |
| Tween/MovieClip | [Game README](node_modules/@kurot/game/README.md) |
| HUD, controls and skin lifecycle | [UI README](node_modules/@kurot/ui/README.md) |
| KUI/build commands | [CLI README](node_modules/@kurot/cli/README.md) |
| Fonts, colors and language startup | [Template guide](node_modules/@kurot/cli/docs/game-template.md) |

These links are project-relative and become available after installation.
Read package.json, pnpm-lock.yaml and `pnpm list --depth 0` for declared, locked
and installed versions. Use public `dist/index.d.ts` and re-exported declarations
to confirm APIs; older installations can lack newer guides. Published Game 2.0.0
has README/types but omits docs/. Use those before consulting versioned source.

The 2× default atlas needs Core >= 2.5.0 within 2.x; also satisfy the installed
UI's Core peer. ui-document supports this starter's stylesheet parsing.
CLI-compiled skins run through UI; add ui-runtime only for its materialization
features. Existing project dependencies remain project-owned.
