# Star Catcher

A complete, asset-free Core game: arrows/A/D or touch move a basket, each caught
star earns 10 points, and three misses end the round. Pause, resume, restart and
Close demonstrate application-owned lifetime management. All gameplay graphics
and HUD text render through Kurot; native HTML controls provide keyboard-accessible
round commands and an accessible status mirror.

## Run

Use Node.js >= 20 and pnpm 10.33.0 in this directory:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the printed URL, normally http://localhost:3000. Press Start, then move with
Left/Right or A/D; tap/drag the playfield on touch. Refresh manually after a build.
Window blur or backgrounding pauses gameplay; Resume is explicit. Close disposes
the application; reload to play again.

The runtime is exact registry Core 2.5.4. CLI 3.3.1 matches the existing demo;
TypeScript, Vitest, Playwright and tsx use versions already present in the
repository. This example owns its new lock; existing SDK/example dependencies
and locks are unchanged. The tsx launcher handles the TypeScript CLI config
without requiring Node's newer built-in type stripping.

## Verify

Install the pinned Playwright Chromium once if it is not already available:

```sh
pnpm exec playwright install chromium
pnpm check
```

`check` runs strict TypeScript checking, Vitest rule tests, development/release
builds, then the same browser tests against both generated outputs. Browser
checks use temporary localhost ports, a controlled clock and real keyboard/touch
events. They assert scoring, three-miss ending, pause/resume, reset on restart,
stable window-listener counts across repeated restarts, final cleanup, narrow
layout and console/resource errors. Each server is closed when its check ends.
Failed runs retain Playwright traces/screenshots in `test-results/`.

Individual commands: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm release`,
`pnpm test:browser` (requires both built outputs). The browser runner serves
`bin-debug/` and the most recent `bin-release/web/<timestamp>/` over HTTP.

## Read the smallest useful slice

Start with the [game quick guide](../../packages/core/docs/game-authoring.md)
in this engine checkout, then:

| Change | Read |
| --- | --- |
| Scoring, movement, lives, collision | [GameModel.ts](src/GameModel.ts) |
| Keyboard/touch mapping and release | [GameInput.ts](src/GameInput.ts) |
| Start, pause, clock and scene cleanup | [GameSession.ts](src/GameSession.ts) |
| Canvas visuals and HUD | [GameView.ts](src/GameView.ts) |
| Restart, controls, app destruction | [Main.ts](src/Main.ts) |
| Automated acceptance | [model tests](test/model.test.ts), [browser tests](test/browser/game.spec.ts) |

Spawn positions repeat in a fixed sequence to reproduce behavior; there is no
backend or network asset dependency. This example supplies application state,
collision and session ownership; it does not add new engine APIs.

During play, one session owns one ticker callback and its input listeners.
Pause/end unregister those callbacks. Restart disposes the old session before
creating a new one on the same Player. Final Close/pagehide also aborts DOM
controls, destroys app adapters and stops the shared ticker because this page
owns all its consumers. Removing a display child alone is not teardown.

The quick guide ships in Core 2.5.5. This example keeps its exact published
Core 2.5.4 pin, which does not contain that file; read the repository guide.
Installed public API declarations still come from
the exact registry package. No local engine-source binding is needed.
