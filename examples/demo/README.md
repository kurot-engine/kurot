# Core-only demo

A minimal Kurot entry with one Player and a Sprite root. It installs registry
Core 2.6.0 and CLI 3.8.0 through its own pnpm lockfile; no UI or Game package is
required.

## Run

Use Node.js with native TypeScript config loading (22.18+) and pnpm in this
directory:

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
