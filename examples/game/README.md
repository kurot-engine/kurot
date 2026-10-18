# Game example

The ordinary scene demonstrates resource loading, UI and tween animation.
The `?ui=1` route shows the default KUI skin kit, authored in
[DefaultUISkin.kui.xml](resource/ui/DefaultUISkin.kui.xml), with native Core/UI
rendering. Buttons, selected/disabled states, text input, ComboBox, TabBar,
sliders, progress, panel closing and hidden-bar list scrolling are interactive.

## Run the example

The lock installs registry Core 2.5.4, which supports the 2× skin kit. It also
retains UI 3.1.0, Game 2.0.0, document 0.13.0 and CLI 3.3.1. These are this
example's baseline, not the versions resolved by today's new-project template.

For the ordinary scene, run from this directory:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

For the current `?ui=1` gallery, use this checkout's CLI: its constructor-name
preservation fixes default Theme lookup for controls such as Scroller. The
example's installed CLI 3.3.1 predates that correction. From the repository root:

```sh
pnpm --dir packages/cli build
cd examples/game
node ../../packages/cli/dist/index.js dev
```

Open the printed URL with `?ui=1`; refresh manually after rebuilds. For one-shot
checks, use the same CLI with `build` or `build --release`. It consumes this
example's installed SDKs without changing dependencies or locks. Neither a Core
source build nor an isolated source trial is needed for its installed Core.

## Ownership

Registry SDK versions remain controlled by this example's package.json and
lockfile. StyleManager loads licensed project fonts before starting the scene.
Default skins, color configuration and generated atlas assets are synchronized
from the CLI template by [the private asset tool](../../tools/default-ui-assets/README.md).
