# Texture density

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

## Authoring and verification

The default KUI kit uses a 2× atlas while retaining logical layout, hit targets
and nine-slice grids. Standalone 1× textures keep resolution=1. Authoring tools
must divide physical atlas frame dimensions by resolution when measuring logical
previews/grids. Runtime PNG/JSON replacement must preserve the density metadata.
See [default UI skins](../../cli/docs/default-ui-skins.md).

Core unit tests cover mixed densities, trimmed views, validation, fixed borders,
clip/repeat and rotated edge crops. Browser fill tests compare Canvas/WebGL 1/2
at different output resolutions and source densities, including tint, texture
swaps, cache refresh and nine-slice invariance. Use the package's existing build,
unit and visual-regression commands when changing this contract.

## Decoded pixel ownership

Core >= 2.8.0 within 2.x accepts ImageBitmap sources through the BitmapData
constructor or source setter.
With premultipliedAlpha=false (the default), WebGL uploads normalize these pixels
through a temporary Canvas 2D surface before uploading premultiplied pixels. This
works for both native ImageBitmap alpha modes; the browser does not expose that
mode and ignores WebGL's unpack-premultiply switch for ImageBitmap. The scratch
surface is reset immediately after upload, including failures, and the source is
neither mutated nor closed by normalization. This path adds conversion work at
upload time; it is not an asynchronous decoding API.

To avoid that extra conversion, create decoded sources with
`createImageBitmap(image, { premultiplyAlpha: 'premultiply' })` and set
`bitmapData.premultipliedAlpha = true`. That flag is a caller declaration of
already-premultiplied pixels, not an instruction to change an ImageBitmap's alpha
mode. Incorrect declarations cannot be detected from native ImageBitmap metadata.
Density and atlas coordinates retain their normal source-pixel units.

BitmapData.dispose() releases an owned ImageBitmap with close() exactly once
and immediately deletes its current WebGL upload. Set deleteSource to false for
a borrowed decoded source; its owner must close it. Texture views sharing the
BitmapData must coordinate disposal. Removing a display node does not dispose
shared pixels. Cleanup continues if upload deletion throws and surfaces the
collected error afterwards. A context-restored upload replaces the old cleanup
hook; disposing then releases the new upload.

Restoration tracking uses a weak BitmapData index plus an iterable set of weak
references. New registration inspects at most eight references with a persistent
cleanup cursor; cached uploads and indexed reuploads do not scan the set. A
context restoration invalidates live uploads and prunes dead entries in one pass,
retaining the index for reupload. Explicit disposal immediately removes the set
entry and index and clears an idle cleanup cursor when the set becomes empty.
Uncollected metadata for naturally abandoned sources is pruned by later
registration sweeps or restoration; these weak entries do not own the pixels.
