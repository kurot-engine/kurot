# Texture density

This API is included in published Core 2.5.0, with registry version metadata
verified on 2026-10-10. Published Core 2.4.0 and earlier do not interpret sheet `resolution`.

`new Texture(resolution)` describes source pixels per logical unit. The default
is 1; the value must be finite and positive, is immutable, and is inherited by
SpriteSheet views. Different densities can share one scene and GPU batch.
Player/ScreenAdapter resolution controls the output canvas independently.

```ts
const texture = new Texture(2);
texture.setBitmapData(new BitmapData(image));
// A 56×56 image has textureWidth/textureHeight of 28×28.
const icon = new Bitmap(texture);
```

## Units

| Value | Unit |
| --- | --- |
| BitmapData width/height | Physical source pixels |
| Texture bitmapX/Y and bitmapWidth/Height | Physical atlas sampling pixels |
| Texture sourceWidth/Height | Physical atlas page pixels used for UV normalization |
| Texture offsetX/Y and textureWidth/Height | Logical units |
| Texture scaleBitmapWidth/Height | Logical size of the sampled upright region |
| Texture pixelScale | Logical units per source pixel, including textureScaleFactor |
| SpriteSheet.createTexture arguments and sheet frame geometry | Source pixels |
| Bitmap/Image width/height, scale9Grid and XML layout | Logical units |

At the normal textureScaleFactor of 1, logical frame sizes and trim offsets are
source values divided by resolution. Atlas coordinates and page dimensions are
never divided for sampling. A grid is relative to the original untrimmed logical
frame; atlas placement and trimmed physical offsets do not change that frame.

## Sheet resources

The density lives in the atlas JSON, beside `file` and `frames`, rather than in
the resource manifest or XML. Omitting it retains 1× behavior. Invalid values
fail the sheet load before its image is requested.

```json
{
  "file": "kui.png",
  "resolution": 2,
  "frames": {
    "button_up": { "x": 8, "y": 8, "w": 96, "h": 96 }
  }
}
```

The original frame is 48×48 logical units. Its manifest default remains
`"scale9grid": "16,16,16,16"`. Images keep their existing XML allocation and
corner sizes. Crop/trim/sourceW/sourceH in the sheet are physical pixels;
logical original dimensions are sourceW/resolution and sourceH/resolution.

Scale, clip, repeat, tint, nine-slice and Canvas-backed caches use each texture's
pixelScale. Repeat periods and fixed nine-slice borders stay logical. UVs and
GPU uploads still address the physical page. Mesh vertices remain authored
logical geometry; density does not rescale vertices.

Standalone ImageAnalyzer resources retain 1×; use an explicitly constructed
Texture for an independently loaded high-density image. No filename suffix is
inferred. RenderTexture retains its capture API and does not accept source-density
constructor arguments. BitmapFont's literal descriptor metrics still require a
page with resolution=1; this feature does not reinterpret font metrics.

## Adoption and verification

The default KUI kit now generates 2× pixels from SVG geometry with two physical
pixels of extrusion, preserving logical layout, hit targets and grids. It needs
Core ^2.5.0. Existing 1× resources require no
migration. UI/Game/DragonBones/Spine/ui-runtime peer ranges accepting Core 2.x
can use that Core release without an SDK bump. CLI still has no Core dependency.

The source trial lives in an isolated directory under docs-internal and binds
the built checkout Core explicitly; it does not alter registry locks. Read
[default KUI skins](../../cli/docs/default-ui-skins.md) for the preview command.
Publish Core 2.5.0 before CLI 3.6.0 so new scaffolds resolve the required Core.
Editor/Reskin resource authoring tools must adopt the new Core and divide physical
frame dimensions by sheet resolution when validating logical grids or measuring
previews; their current released installations do not understand this metadata.

Unit regressions cover mixed densities, nested trimmed views, atlas loading,
fixed borders, trim, clip/repeat and rotated edge crops. The minified browser
fill tests compare Canvas/WebGL 1/WebGL 2 pixels at output resolution 1×/2×
with source density 1×/2×/3×, including tint, texture swaps, cache updates and
nine-slice invariance.

Source verification on 2026-10-10: Core implementation/declaration builds and
890 unit tests pass; CLI's 112 tests pass. All six minified pixel cases pass
across the three backends and two output resolutions. The isolated native KUI
gallery passes dev/release checks in all three backends at render resolution 2:
640×1136 logical stage/CSS, 1280×2272 backing pixels, 48×48 logical button frames
from 96×96 source regions, 28×28 logical icons from 56×56 source regions, unchanged
16,16,16,16 grids, pressed-state restoration and correctly mapped button taps.
