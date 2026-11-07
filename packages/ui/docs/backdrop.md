# Backdrop

Available in published UI **5.1.0**, requiring Core **^3.2.0**.

`Backdrop` wraps Core's `BackdropBlur` with standard UI layout. Create it in
TypeScript and insert it before the existing modal input/dim mask and popup.
Earlier rendered content is blurred; the popup and later prompt/guide layers
stay sharp. It does not pause gameplay or block input by default.

## Fill a UI layer

```ts
import { Backdrop, UILayer } from '@kurot/ui';

const layer = new UILayer();
const backdrop = new Backdrop({
    blurX: 36,
    blurY: 36,
    quality: 1,
    resolution: 0.5,
});
backdrop.left = backdrop.right = backdrop.top = backdrop.bottom = 0;
layer.addChild(backdrop);
// Add the existing input/dim mask and popup after the backdrop.
// Add layer to the application's existing Stage/layer hierarchy.
```

`UILayer` follows logical Stage dimensions; its default BasicLayout stretches
the constrained backdrop. Resizing, stage reattachment and ordinary validation
update the sampled rectangle. Backdrop itself registers no Stage resize or
ticker listeners. It does not introduce a global fullScreen flag or change
stage scaling/DPR. Use the usual validation/render cycle; `validateNow()` is
available when immediate synchronous layout is needed.

The four zero constraints fill a parent with BasicLayout. They are explicit,
not constructor defaults. Inside an ordinary Group they fill that Group rather
than the Stage. Other layouts keep their own allocation rules.

## Regional layout and controls

Use normal width/height, left/right/top/bottom, percent size and center
constraints. Width/height options set explicit logical UI sizes; parent layout
can allocate a different frame, as for other components. The effect has no
intrinsic preferred size. Its previous allocated size cannot enlarge an
automatically measured parent or keep a cleared constraint's old size alive.

| Control | Contract |
| --- | --- |
| `blurX`, `blurY` | Local logical radii, initially 4; finite and non-negative. Zero disables an axis. |
| `quality` | Integer GPU horizontal/vertical pass pairs, 1–16; initially 1. |
| `resolution` | Positive optional pixels-per-local-unit cap. Undefined inherits target density; lower values reduce work and detail, without changing layout. |
| `alpha` | Mixes original and blurred pixels; zero preserves the background. Ancestor alpha participates. |

Set these properties directly after construction. Blur validation and dirty
tracking belong to Core. Display transforms, flips and rectangular clips apply
to the local UI frame. A full-screen Retina blur still costs a capture and blur
each frame; start with quality 1 and a suitable resolution cap.

## Input, ordering and lifecycle

The wrapper and its internal effect default to disabled input. The wrapper
returns no hit target so a Core ancestor cannot mistake its rectangle for an
input-blocking descendant. Existing container hit policies still apply:
an otherwise empty Group/UILayer can catch input through its own bounds unless
configured with `touchThrough = true`. Keep modal event blocking in the existing
input mask. Explicitly enabling Backdrop.touchEnabled opts into bounds hits.

Remove it with `layer.removeChild(backdrop)` to restore the underlying scene
on the next render; re-add it before the popup to reuse the same effect node.
Hiding it or setting alpha to zero also leaves the background unchanged.
There is no per-node captured image, timer or explicit GPU disposal API.
Stable dimensions reuse Core's context/renderer-owned targets and canvases;
Player destruction and context restoration follow Core's resource lifecycle.

This is a code-created visual, not a content container or a skinned control.
It does not resolve a default Theme/UIContext Skin. Do not place content inside
it. This change adds no KUI catalog, CLI compilation or semantic runtime support.
SAO and application layer organization remain unchanged.

## Rendering boundaries

The [Core BackdropBlur contract](../../core/docs/backdrop-blur.md) applies:
WebGL 1/2 sample on the GPU; Canvas uses a native-filter approximation and
preserves original background where filters are unavailable. Parent filters
and object masks can isolate the sampled layer. Rendered texture caches on
the wrapper or an ancestor are rejected, since a static cached image cannot
hold a dynamic backdrop. Multiple backdrops execute in display order, so an
upper backdrop can blur a lower popup while its own later popup stays sharp.

## Verification

From `packages/ui`:

```sh
pnpm build
pnpm test
pnpm exec playwright test test/browser/backdrop.spec.ts --workers=1
```

Unit coverage checks default/explicit sizing, full-layer and regional layouts,
growing/shrinking dimensions, percent/center/scale allocation, input, absent
intrinsic size, default-Skin bypass and reuse across attachment cycles.
Browser checks use published Core and real Canvas/WebGL 1/WebGL 2 pixels at
1×/2×/3× device/output density: dynamic background, sharp foreground, alpha,
stacking, clipping, transforms, resize, input, removal/reinsertion and recovery
after a rejected texture cache. No local source alias replaces Core.
