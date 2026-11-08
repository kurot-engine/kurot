# Core-only demo

A minimal Kurot entry with one Player and a Sprite root. It installs registry
Core 3.2.3 and CLI 5.0.0 through its own pnpm lockfile; no UI or Game package is
required.

## Run

Use Node.js 22.x (22.12.0 or later) and pnpm in this directory. `.nvmrc`
selects Node 22; CLI 5 loads TypeScript configs and relative helpers itself:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

For strict development and minified release builds:

```sh
pnpm build --strict
pnpm release --strict
```

## Stage configuration

Main validates the canvas and calls `createPlayer({ canvas })`. Maintain stage
dimensions, scale mode, orientation and frame rate in `kurot.config.ts`; the CLI
writes canvas attributes consumed by Core.

During dev, save stage settings, wait for a successful update and manually
refresh the browser. No dev restart is needed for stage edits. Structural
configuration or imported configuration helper changes still require a restart.
