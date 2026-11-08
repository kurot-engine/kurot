<p align="center">
  <img src="packages/cli/templates/game/template/web/logo.png" alt="Kurot Game Engine" width="160" height="160">
</p>

<p align="center">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a>
</p>

# Kurot

Kurot is an open-source TypeScript engine for building 2D games that run in the browser.

## Features

- **Rendering:** Build a display tree from sprites, shapes and text. Kurot batches WebGL draw calls across textures and falls back to Canvas 2D when WebGL is unavailable.
- **Animation:** Use tweens, MovieClips and particles for motion, or play DragonBones skeletal animations.
- **Game UI:** Build HUDs and menus with skinnable components. Edit `.kui.xml` skins in [Kurot Editor](https://github.com/kurot-engine/kurot-editor-release); the CLI compiles them into ES modules.

## Comparison

| Project | Development model | Backends used in this benchmark |
| --- | --- | --- |
| Kurot | 2D game engine with a display tree, skinnable UI and a project CLI | WebGL 1 and 2 |
| [PixiJS 8](https://github.com/pixijs/pixijs) | 2D rendering library for composing scenes from containers and sprites | WebGL 1 and 2 |
| [Egret 5.4.1](https://github.com/egret-labs/egret-core) | HTML5 game engine with a display list and EUI components | WebGL 1 |

The [benchmark](packages/core/README.md#test-pages) runs the same seven workloads across the three projects, including sprite batching, moving objects and texture swaps. Compare frame times on the same device, browser and backend; use WebGL 1 to include all three.

## Quick start

Use **Node.js 22.12.0 or newer** (the project uses Node 22.x) and **pnpm**. Create a game without cloning the engine:

```sh
npx @kurot/cli@5 create my-game --template game
cd my-game
pnpm install
pnpm dev
```

Open the URL printed by the dev server. Edit `src/Main.ts` to change the game; run `pnpm release` to produce a build for deployment.

[Game guide](packages/core/docs/game-authoring.md) · [Star Catcher example](examples/star-catcher/README.md) · [API reference](docs/api-documentation.md)
