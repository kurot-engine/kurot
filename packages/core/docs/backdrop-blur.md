# BackdropBlur

Requires Core >= 3.2.0 within 3.x; version 3.2.0 is published on npm.
For UI layout constraints, see the separate [UI 5.1 Backdrop wrapper](../../ui/docs/backdrop.md).

`BackdropBlur` is a display-tree leaf that blurs pixels already drawn in the
current compositing layer. Later siblings, including popup text, remain sharp.
It captures native canvas content, excluding DOM and the canvas CSS background.

```ts
import { BackdropBlur, type DisplayObjectContainer, type DisplayObject } from '@kurot/core';

function insertModal(
    layer: DisplayObjectContainer,
    eventMask: DisplayObject,
    popup: DisplayObject,
    width: number,
    height: number,
): BackdropBlur {
    const backdrop = new BackdropBlur({
        width, height,
        blurX: 12, blurY: 12,
        quality: 2,
        resolution: 1,
    });
    layer.addChild(backdrop);
    layer.addChild(eventMask);
    layer.addChild(popup);
    return backdrop;
}
```

Update dimensions with normal application resize handling. Remove the effect
with `layer.removeChild(backdrop)`; normal rendering restores the original scene.
Keep the existing event mask and modal controller responsible for input and game
suspension. The node registers no ticker callback and defaults to
`touchEnabled = false`, passing hit testing through ordinary containers.

## Interface and coordinates

| Property | Contract |
| --- | --- |
| `width`, `height` | Finite, non-negative local logical dimensions; defaults 0. Resizing changes the region, not transform scale. |
| `blurX`, `blurY` | Finite, non-negative local logical radii; defaults 4, matching BlurFilter. Both zero leave pixels unchanged. |
| `quality` | Integer GPU horizontal/vertical pass pairs, 1–16; default 1. Same kernel, padding and large-radius downsampling as BlurFilter. |
| `resolution` | Positive optional pixels-per-local-unit cap. Undefined inherits transformed target resolution; oversized targets reduce resolution to fit. |
| `alpha` | Original/blurred pixel interpolation: zero preserves the original, one applies full blur. Inherited world alpha participates. |

Position, scale, rotation, skew, flips and anchors use ordinary display transforms.
Blur axes follow the local coordinate system. Sampling includes blur padding;
output is limited to the transformed rectangle and active clips, excluding its
axis-aligned bounding-box exterior. Sampling at target edges extends the nearest
pixel to avoid transparent or dark fringes on opaque scenes.

Scene changes update on normal rendering even when the effect is not dirty.
Sampling excludes the node's own output and later draw commands. Stacked effects
execute sequentially: an upper backdrop includes lower blur and lower popups.
There is no recursive scene capture or previous-frame snapshot.

## Compositing layers and restrictions

Ordinary containers and `isRenderGroup` preserve the active background. Render
groups only isolate instruction rebuilding. Scissors and stencil clips limit
output without changing the sampled layer.

Parent filters or object masks that create an offscreen layer isolate contents.
A backdrop inside samples only earlier pixels in that layer, excluding outside
stage siblings. Parent filters then process the completed layer. An object mask
directly on an otherwise empty BackdropBlur also isolates it and leaves no
earlier local pixels to blur. To clip stage-background effects regionally, use
a `Rectangle` mask or `scrollRect` on the node or an ordinary ancestor.

The node requires its own `blendMode` to be `source-over` and its own `filters`
to be empty; unsupported combinations throw. Tint does not recolor copied
background. Style panels and dim overlays as independent later siblings.

`cacheAsTexture` / `cacheAsBitmap` on the effect or any rendered cached ancestor
is rejected explicitly, including effects added to existing caches. A fixed
subtree image cannot retain a dynamic backdrop. `RenderTexture` uses Canvas and
only samples earlier content inside its capture target, not the live stage
behind an isolated object.

Premultiplied original and blurred RGBA are interpolated before replacement,
preserving transparent alpha without stacking a second copy over the original.

## Backends and resources

WebGL 1/2 flush earlier commands and capture directly at the blur's working
density. Large radii apply BlurFilter's existing 32-physical-pixel kernel limit
before capture, avoiding full-density local captures followed by redundant
downsample/upsample passes. Output rasterizes only the transformed effect quad,
with premultiplied constant-alpha blending against the existing destination.
It does not sample a second sharp background texture during compositing.
Production rendering uses no CPU pixel readback, Bitmap or RenderTexture.

Existing offscreen parent textures are sampled directly into the low-density
capture, with no extra parent copy. Single-sample WebGL 2 default canvases can
also downsample during a framebuffer blit. WebGL 1 and antialiased default
canvases need a native-size temporary copy before local sampling; that temporary
returns to the pool before blur passes begin. Preserve the application's canvas
antialiasing and ordinary scene rendering. Multisample resolve cannot freely
rescale/crop source and destination rectangles; see the
[Khronos framebuffer blit contract](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glBlitFramebuffer.xhtml).

Snapshots/intermediate textures borrow the context-owned effect pool (16 idle
targets / 64 MiB). Stable dimensions reuse GPU textures and framebuffers.
Targets return in `finally`; borrowed parent textures remain caller-owned.
Nodes retain no snapshot or GPU handles. Resizing
can allocate new pool entries; eviction and Player destruction release them.
Context restoration discards invalid entries and recompiles shaders on demand.

Canvas uses three renderer-owned working canvases for sampling, native
`context.filter` blur and interpolation. Stable dimensions reuse canvases and
backing stores, with each working surface capped at 4096 per side and 4 Mi pixels.
Player destruction releases them. Canvas uses the existing
average-radius CSS approximation, excluding separate-axis radii and GPU pass
counts. Browsers without `context.filter` leave original background unchanged.
Sampling errors propagate and the next frame resets working state.

Dynamic effects still copy and blur every rendered frame. Prefer small regions,
modest radii and a resolution cap where full device density is unnecessary.

## SAO integration sketch

Keep current Stage layer registrations and PureMVC ownership. Insert the effect
inside the existing modal layer before its dim/event mask and popup view:

```text
previous Stage layers
  modal layer: BackdropBlur → existing event mask → popup view
later Stage layers: prompts → guides → pointer effects
```

Existing show/hide hooks can add/remove it and synchronize dimensions. Higher
modal layers naturally blur lower popups; later prompts and guides remain sharp.
No stage-wide RenderTexture capture or temporary guide hiding is needed.
This is an integration example; SAO is unchanged.

## Browser verification

From `packages/core`:

```sh
pnpm exec playwright test --config examples/visual-regression/playwright.config.ts backdrop-blur.spec.ts
pnpm exec vite --config vite.config.ts --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000/backdrop-blur/` for live background, blur/alpha
controls, two popup layers and remove/reinsert comparison. Links select WebGL
1, WebGL 2 or Canvas. Tests read real rendered pixels; test-only readback is
separate from the production GPU path.

## GPU timing

Open `http://127.0.0.1:3000/benchmark/backdrop/` to measure a fixed 960 × 540
logical scene on a 1920 × 1080 canvas. The benchmark uses
`EXT_disjoint_timer_query_webgl2`, including capture, blur and compositing in
each measured frame. It rejects unavailable/disjoint timers rather than
substituting CPU submission or `gl.finish()` wall time. Each scenario clears
idle effect targets, warms up 12 frames and collects 30 GPU samples; raw samples,
median, p95 and warmed idle-pool bytes are reported. A repeat run can vary with
GPU clocks and other graphics work. Run the benchmark without concurrent GPU
tests; it characterizes this fixture and device, not a production-game frame rate.
