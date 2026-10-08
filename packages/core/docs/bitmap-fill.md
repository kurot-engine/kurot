# Bitmap fill modes

Core 2.3.3 is published. Version 2.3.2 stretches all fill modes;
adopt the patch and rebuild to receive this correction.

`Bitmap.fillMode` also controls UI `Image` rendering:

| Mode | Behavior |
| --- | --- |
| `scale` | Scale content and trim offsets into the requested original-size box; apply nine-slice when configured. |
| `repeat` | Tile at the texture's original logical width/height, retaining transparent trim margins; crop incomplete right/bottom tiles. |
| `clip` | Draw once at natural size; crop when the destination is smaller, leave remaining space empty when larger. |

`scale9Grid` applies only to `scale`, as documented by Bitmap. A resource-level
nine-slice default does not override an Image's explicit repeat or clip mode.
Neither rendering nor changing fill mode rewrites texture data, resource manifests
or Skin XML. Layout and selection continue to use the requested component size.

Atlas source coordinates remain inside the selected frame. Rotated frames use
the clockwise atlas convention; destination dimensions remain upright. Sampling,
tint, alpha and scene transforms retain their existing contracts.

Both render paths use `player/bitmap-fill.ts`: WebGL emits tile quads through
BitmapPipe, while CanvasRenderer draws tile regions. Bitmap caches rasterize
through CanvasRenderer even when the main Player uses WebGL. Cached ancestors
refresh after changing the child fill mode through the existing dirty contract.

The helper emits visible regions directly without allocating tile arrays. Work
scales with the number of tiles; WebGL retains normal texture batching, and cached
containers reuse their rasterized result until invalidated.

`test/BitmapFill.test.ts` covers source/destination geometry, trim, edge clipping,
invalid periods, fractional dimensions and nine-slice precedence. The minified
`examples/visual-regression/tests/bitmap-fill.spec.ts` compares actual pixels with
native Canvas patterns on Canvas/WebGL 1/WebGL 2 at 1x/2x, including rotation,
tint, cache updates and the existing scale path.

There are no new APIs or dependencies. Existing UI, Game, DragonBones, Spine and
ui-runtime Core peers accept this patch. Their SDK versions and minimum ranges
do not change; optional development lock adoption is separate. Editor's local
0.23.1 trial bound one built Core through `KUROT_CORE_PATH` while retaining its
published 2.3.2 dependency lock. Editor 0.23.2 adopts registry Core 2.3.3 and
updates its Bun lock; ordinary builds no longer require a local engine checkout.
