# Bitmap fill modes

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

[Texture density](texture-density.md) additionally
tests source densities 1×/2×/3× at both output resolutions. Physical atlas sampling
and logical repeat periods remain separate, including tinted cached images and
nine-slice texture swaps.
