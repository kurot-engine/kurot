# Game example

The ordinary scene demonstrates resource loading, UI and tween animation.
The `?ui=1` route shows the default KUI skin kit, authored in
[DefaultUISkin.kui.xml](resource/ui/DefaultUISkin.kui.xml), with native Core/UI
rendering. Buttons, selected/disabled states, text input, ComboBox, TabBar,
sliders, progress, panel closing and hidden-bar list scrolling are interactive.

The current 2× skin kit needs published Core ^2.5.0; the registry
lock still installs an older Core. Use an isolated source trial for now:

```sh
pnpm --dir packages/core build
pnpm --dir packages/cli build
pnpm --dir tools/default-ui-assets preview
```

The tool prints its trial directory under docs-internal. Run the repository CLI
dev command from that directory and open its URL with `?ui=1`. The tool also
creates a strict minified release directory for static serving. It binds checkout
Core explicitly without changing this example's installation or registry lock.
After Core 2.5.0 is explicitly installed here, ordinary
builds can run directly in examples/game. Existing compatible dependency ranges
need no incidental bump.

Registry SDK versions remain controlled by this example's package.json and
lockfile. StyleManager loads licensed project fonts before starting the scene.
Default skins, color configuration and generated atlas assets are synchronized
from the CLI template by [the private asset tool](../../tools/default-ui-assets/README.md).
