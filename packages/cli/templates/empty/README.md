# Kurot empty project

A minimal Core-only application. The initial canvas is blank; the browser
console prints `Kurot game started`. Add your gameplay in `src/Main.ts`.

## Run and build

Use Node.js 20+ and pnpm from this project directory:

```sh
pnpm install
pnpm dev
```

Open the URL printed by the server (default `http://localhost:3000`). Refresh
the browser manually after a successful rebuild.

```sh
pnpm build
pnpm release
```

Development output is `bin-debug/`; release output is
`bin-release/web/<timestamp>/`. Serve the generated directory over HTTP for
browser checks. `pnpm clean` removes both output trees.

The CLI transpiles with esbuild; a successful build does not establish complete
TypeScript type correctness or gameplay behavior. After changes, check the
browser console, resource requests and intended interactions.

## Project map

- `src/Main.ts`: creates the single Player and root Sprite; add game objects
  and input/update logic here or in application modules it imports.
- `kurot.config.ts`: build entry, stage settings and output paths. Keep explicit
  createPlayer options in Main consistent with the intended stage settings.
- `template/web/index.html`: authored HTML and canvas.
- `bin-debug/`, `bin-release/` and `.kurot/`: generated files; edit their inputs.

## Read only what the task needs

For gameplay, read Core's `docs/game-authoring.md` when the installed package
includes it. In an engine checkout, that guide links `examples/star-catcher`,
a complete game with `pnpm check`. The guide ships since Core 2.5.5; Star Catcher
is repository content. Older installations can use their README/types instead.

After installation, start with [Core usage](node_modules/@kurot/core/README.md).
Use [resources](node_modules/@kurot/core/docs/resource.md),
[audio](node_modules/@kurot/core/docs/audio-playback.md) or
[CLI commands](node_modules/@kurot/cli/README.md) when relevant. These links are
project-relative and become available after installation.

Read `package.json`, `pnpm-lock.yaml` and `pnpm list --depth 0` for the declared,
locked and installed versions. Public signatures are in each installed package's
`dist/index.d.ts` and re-exported declarations. For an older package lacking a
linked guide, use that installed version's README/types, then its exact version
source if needed. Repository `src/` paths are not guaranteed inside npm packages.

The project starts with Core only. Add further SDKs explicitly when gameplay
requires them; keep dependency adoption separate from ordinary feature work.
