# Canvas stage configuration

`createPlayer()` resolves each startup stage setting independently:

1. An explicitly supplied option.
2. Its corresponding canvas attribute.
3. The existing default shown below.

| Option | Canvas attribute | Default without either |
| --- | --- | --- |
| `contentWidth` | `data-content-width` | `canvas.width`, or 640 when zero |
| `contentHeight` | `data-content-height` | `canvas.height`, or 1136 when zero |
| `scaleMode` | `data-scale-mode` | `showAll` |
| `orientation` | `data-orientation` | `auto` |
| `frameRate` | `data-frame-rate` | 60 |

This behavior requires Core >= 2.6.0 within 2.x. CLI 3.8.0's game and empty
templates use canvas-only startup and require that runtime. Older installations
keep explicit stage options until adopting that Core release.

For CLI-authored pages, put the defaults in `kurot.config.ts` or `.js`:

```ts
export default {
  stage: {
    width: 1136,
    height: 640,
    scaleMode: 'showAll',
    orientation: 'landscape',
    frameRate: 60,
  },
};
```

The CLI writes these values into the HTML canvas. The browser entry only needs:

```ts
import { createPlayer, Sprite } from '@kurot/core';

const canvas = document.getElementById('gameCanvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing gameCanvas.');
}
const app = createPlayer({ canvas });
app.start(new Sprite());
```

An explicit `createPlayer({ canvas, frameRate: 30 })` overrides only the frame
rate. It also bypasses validation of that attribute. Consumed width/height
attributes must be finite and positive; frame rate must be a positive integer.
Scale modes use `StageScaleMode`; orientations use `OrientationMode`, including
`landscapeFlipped`. Invalid consumed attributes throw before Player allocation.

Attributes are read once. Editing them does not reconfigure a live Player.
With CLI stage watching, save configuration, wait for its successful update,
then manually refresh the browser. A new Player reads the new page defaults.
Existing ScreenAdapter sizing, logical coordinate rounding and DPR behavior
remain unchanged; these are design dimensions, not backing-store pixel sizes.

Core does not load the CLI or import project configuration. Non-CLI applications
can supply explicit options or author the same canvas attributes themselves.

## Verification

After building both `packages/core` and `packages/cli`, run from Core:

```sh
pnpm test:stage-config
pnpm test:stage-config --canvas
```

The real CLI/browser check uses the empty template, edits stage defaults on the
same dev process, manually reloads the page and inspects the resulting Stage.
It also covers invalid-config retention/recovery, explicit overrides and release
startup, using built Core/CLI without modifying consumer locks.
