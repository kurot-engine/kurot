# GPU filters

Kurot executes `displayObject.filters` in array order. Each filter reads the
previous filter's image. WebGL 1 and WebGL 2 are supported; shader sources are
compiled verbatim, with no automatic GLSL translation.

## Built-in effects

- `ColorMatrixFilter`: color-matrix transform with premultiplied-alpha handling.
- `BlurFilter(x, y, quality)`: non-negative logical-pixel radii; `quality` is an
  integer from 1 to 16. Each quality step adds one horizontal/vertical pair,
  using radius / sqrt(quality) to approximately preserve variance. The kernel
  remains the existing triangular kernel. Large radii use a reduced-resolution
  image so the per-axis shader radius stays within 32 physical pixels, then
  resample back. This trades fine detail for wider blur; it is not bokeh DoF.
- `GlowFilter` / `DropShadowFilter`: the existing radial alpha-sampling shader.
  `knockout=false` preserves the original. `hideObject` hides the original for
  shadows. Their `quality` field remains serialized metadata; it does not
  change this shader's fixed sample count.
- `BloomFilter`: LDR brightness extraction, blur, and original-image composition.

```ts
import { BloomFilter, BlurFilter } from '@kurot/core';

const blur = new BlurFilter(12, 12, 2);
blur.resolution = 0.5;
background.filters = [blur];

const bloom = new BloomFilter({
    threshold: 0.7,
    intensity: 1,
    blur: 12,
    blurScale: 0.5,
});
world.filters = [bloom];
bloom.intensity = 0.8;
```

`Filter.resolution` specifies physical pixels per logical unit. `undefined`
inherits the parent. A filter chain uses the minimum of the parent resolution
and its explicit filter resolutions, additionally limited by GPU texture size.
`BloomFilter.blurScale` reduces only extraction/blur; the original is retained
at the effect's full resolution.

Filtering includes the rendered descendants. Padding from consecutive filters
is added; descendant effect extents are included without changing layout bounds.
A mask/scroll clip on the filtered object clips its final result. Layered
containers provide control over whether a mask clips before or after another
effect. A lone ColorMatrix on an unmasked leaf with inherited resolution retains
its inline fast path; groups and combinations use offscreen composition.

## CustomFilter

Use `CustomFilter.from()` to provide explicit backend variants. Omit a vertex
source to use Kurot's standard filter quad. A missing backend throws a descriptive
error rather than silently drawing the unfiltered image.

```ts
import { CustomFilter } from '@kurot/core';

const dissolve = CustomFilter.from({
    webgl1: {
        fragment: `precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float threshold;
        void main() {
            gl_FragColor = texture2D(uSampler, vTextureCoord)
                * step(threshold, vTextureCoord.x);
        }`,
    },
    webgl2: {
        fragment: `#version 300 es
        precision mediump float;
        in vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float threshold;
        out vec4 result;
        void main() {
            result = texture(uSampler, vTextureCoord)
                * step(threshold, vTextureCoord.x);
        }`,
    },
    uniforms: { threshold: 0 },
    padding: 0,
});
actor.filters = [dissolve];
dissolve.setUniform('threshold', 0.5);
```

The existing `new CustomFilter(vertex, fragment, uniforms)` constructor submits
that exact source pair on either backend; the caller is responsible for source
compatibility. An empty vertex source selects the backend's standard vertex.
The source-pair key distinguishes vertex/fragment boundaries. Compiled programs
are cached by context and actual source, so uniforms are never part of the key.
Do not generate new shader text every frame; update uniforms instead.

Supported uniforms: `float`, `int`, `bool`, floating/integer/boolean vectors,
`mat2`, `mat3`, `mat4`, and their numeric arrays. Values are numbers, booleans,
numeric arrays, `Float32Array`, or `Int32Array`. Matrices use column-major order.
Active uniforms must be supplied with the correct component count; missing,
non-finite, or incompatible values throw before drawing. Unsigned uniforms,
non-square matrices, sampler arrays and uniform blocks are not part of this API.

`setUniform()` / `setTexture()` invalidate attached objects. After direct edits
to an array, `filter.uniforms`, or binding descriptor, call `filter.invalidate()`.
Built-in effect setters invalidate their users as well.

### Coordinates and automatic uniforms

The default vertex accepts `aVertexPosition` (vec2), `aTextureCoord` (vec2), and
`aColor` (vec4), with `projectionVector` (vec2). Custom vertex programs must use
this attribute layout. Vertex displacement needs sufficient `padding` and does
not change scene geometry, layout or hit testing.

`vTextureCoord` uses **bottom-left framebuffer UVs**: the top is y=1. It spans
the entire padded input, not just the unpadded object. Input/output colors are
premultiplied RGBA. `vColor` is neutral in custom intermediate passes because
subtree vertices have already received world alpha/tint. For effects that need
straight RGB, divide by alpha only when alpha is positive, then premultiply the
output again.

| Reserved uniform | GLSL type | Value |
| --- | --- | --- |
| `uSampler` | sampler2D | Previous pass image, texture unit 0 |
| `projectionVector` | vec2 | Quad projection, managed by the renderer |
| `uTextureSize` | vec2 | Input width/height in physical pixels |
| `uInputSize` | vec4 | Input width, height, inverse width, inverse height |
| `uInputClamp` | vec4 | Input texel-center UV min/max |
| `uOutputSize` | vec4 | Output width, height, inverse width, inverse height |
| `uResolution` | float | Requested output pixels per logical unit for this pass |

Only declare the uniforms needed by the shader. They cannot be overridden in
`uniforms` or auxiliary bindings. Small textures may round to one physical pixel.
Use actual `uInputSize` / `uOutputSize` when exact texel spacing matters.

UV distortion should clamp to `uInputClamp`. A sample outside [0,1] otherwise
uses clamp-to-edge sampling, not automatic transparent border behavior.

## Auxiliary images

`textures` maps sampler names to full-image `BitmapData` resources. The caller
retains ownership. Cropped/rotated atlas `Texture` objects are not accepted.
Auxiliary uploads have their own nearest/linear sampling state, so they do not
change the same image's sprite sampling.

```ts
filter.setTexture('uMap', { source: mapBitmapData, smoothing: false });
```

Declare `uniform sampler2D uMap`. Optionally declare `uMapMatrix` (mat3) and
`uMapClamp` (vec4). The default matrix converts bottom-left filter UV to top-left
image UV. For example, in GLSL 1.00:

```glsl
vec2 mapUV = (uMapMatrix * vec3(vTextureCoord, 1.0)).xy;
vec2 displacement = texture2D(uMap, clamp(mapUV, uMapClamp.xy, uMapClamp.zw)).rg * 2.0 - 1.0;
vec2 uv = vTextureCoord + displacement * amplitude / uTextureSize;
gl_FragColor = texture2D(uSampler, clamp(uv, uInputClamp.xy, uInputClamp.zw));
```

This maps the image across the padded input. `transform: [a,b,c,d,tx,ty]` can
replace the affine mapping; it is expressed directly in normalized UV units.
The default is `[1,0,0,-1,0,1]`.

After editing canvas/video content, call `BitmapData.invalidate(source)` so the
next pass uploads the new pixels. Call `filter.invalidate()` when application
scheduling also needs an explicit invalidation. Disposed or unavailable sources
throw instead of sampling stale pixels. Texture units are checked against the
context's fragment-stage limit, including the primary input.

## Multi-pass effects

`MultiPassFilter` accepts 1–32 immutable pass descriptions. A pass reads the
previous output by default. `input: 'original'` reads the input to this effect;
`input: 0` reads the first pass output. Additional `textures` references use the
same notation and are supported by CustomFilter passes only. Forward references,
cycles and nested MultiPassFilter instances are rejected.

```ts
import { MultiPassFilter } from '@kurot/core';

const effect = new MultiPassFilter([
    { filter: extractHighlights, scale: 0.5 },
    { filter: blurHighlights, scale: 0.5 },
    { filter: combine, textures: { uOriginal: 'original' } },
]);
world.filters = [effect];
```

Here `combine` declares `uniform sampler2D uOriginal`. Borrowed framebuffer
inputs share the primary input's bottom-left UV convention; their automatic
`<name>Matrix` is identity. Primary and additional inputs may differ in pixel
size but cover the same logical rectangle. `scale` is relative to the enclosing
effect resolution, not the previous pass. Per-pass filter `resolution` can
further reduce its output resolution. Update child filter uniforms to animate;
replace the MultiPassFilter to change its pass graph.

GPU targets are never exposed to application code. The renderer preserves inputs
until their consumers finish, prohibits framebuffer feedback and recycles owned
targets even after errors. The idle intermediate pool is limited to 16 targets
and 64 MiB. Active pass images, subtree capture buffers and auxiliary images are
not included in that idle limit. Player's framebuffer pool counters report this
intermediate pool. `Player.destroy()` releases idle effect targets and auxiliary
uploads; caller image objects remain intact. Context restoration recreates
programs, intermediate targets and auxiliary uploads.

## Backend and caching boundaries

CustomFilter, MultiPassFilter and BloomFilter are GPU effects. Canvas 2D skips
them; it continues to approximate supported built-in effects through its existing
CSS/pixel paths. Its filter combinations and Blur quality are not pixel-equivalent
to WebGL.

`cacheAsTexture` and `RenderTexture` still rasterize through Canvas 2D. Do not use
them to capture or cache these GPU effects. For post-processing use filter chains
or MultiPassFilter, which retain GPU images.

## Validation

Run from the repository root:

```sh
pnpm --dir packages/core build
pnpm --dir packages/core test
pnpm --dir packages/core test:visual
```

The browser suite includes deterministic scene screenshots and explicit pixel
assertions on both WebGL versions, resource restoration, error recovery, filter
ordering, masks, high-resolution inputs, large-radius blur and Bloom. It is a
Chromium baseline, not a guarantee for every physical GPU or mobile browser.
