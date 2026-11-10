# Subtree texture caches

GPU subtree capture is available in Core >= 3.5.0 within 3.x. Earlier versions
use Canvas rasterization for subtree caches even on the WebGL backend.

`display.cacheAsBitmap = true` aliases `display.cacheAsTexture(true)`.
Use `cacheAsTexture({ resolution, scaleMode })` to select cache sampling;
`cacheAsTexture(false)` releases its storage. No project configuration changes
are required to use the backend's implementation.

## Backend and ownership

WebGL draws the local subtree into a persistent framebuffer texture, using the
same bitmap, text, graphics, mesh, mask and filter pipes as ordinary rendering.
Stable dimensions reuse the texture/framebuffer. Updating a cache does not
rasterize the entire subtree with Canvas or upload a Canvas image of the subtree.
Text and Graphics still use their individual raster textures: new/changed text,
graphics, source pixels or raster density can require their normal uploads.

Canvas rendering keeps its bitmap cache. The Canvas surface is allocated lazily,
so a WebGL-only cache does not allocate a matching Canvas backing store.
`RenderTexture` remains a Canvas snapshot API. Switching between GPU rendering
and Canvas snapshots keeps each backend's cache contents valid.

Each cache owns its GPU surface, independently of the scratch filter-buffer pool.
Disabling the cache deletes that surface. Empty content releases its allocation;
adding content can allocate it again. Temporary stage removal retains the cache
for reparenting and virtualized-list reuse. Destroying the Player releases all
live cache surfaces, including detached ones. Unreachable owners have a GC
fallback; use explicit cache disabling or Player destruction for timely release.
After context restoration, invalid attachments are recreated and content is
rendered again before sampling; source pixels retain their original ownership.

## Coordinates and composition

Cache pixels represent local content. The owner's position, transform, alpha,
clip, mask and filters apply at composition, rather than being captured twice.
Descendant transforms, opacity, clips, masks, filters and nested caches are
captured through the normal WebGL pipes. Descendant filter padding and text ink
are included without changing layout or hit-test bounds. The existing rejection
of BackdropBlur under a cached ancestor remains in force: a fixed subtree texture
cannot represent a changing backdrop outside it.

The cache inherits the active render target's resolution unless an explicit
positive `resolution` was supplied. Invalid explicit resolutions retain the
existing fallback to 1. Pixel dimensions round up and density is capped to fit
the GPU's maximum texture dimensions. `scaleMode` selects linear or nearest
sampling of the completed cache. As with all intermediate textures, fractional
placement and scaling can sample edges differently from direct geometry.

## Updating and measuring

Content changes propagate through ordinary and cached ancestors. Pure placement
changes reuse local cache content. `updateCacheTexture()` explicitly requests a
refresh; resolution/size changes also regenerate it. Browser input rules and
the game clock are independent of caching.

Caching usually benefits subtrees whose pixels change less often than their
placement. A frequently changing subtree still has to be rendered into its cache,
then composited. Lower Canvas/upload cost does not guarantee higher FPS on every
GPU. Player's Draw Calls include submitted draws into cache and effect targets;
CPU render time, GPU work and presentation FPS are different measurements.

## Verification

Run Core build/tests and `pnpm test:visual` from the Core package. The `gpu-cache`
browser cases cover WebGL 1/2, 1x/2x pixels, nesting, clipping, masks, filters,
updates, storage reuse, sampling, texture limits, teardown and context recovery.
The existing Canvas and visual golden checks remain unchanged.

`node tools/verify-cache-list.mjs` runs a native UI List/Scroller with 200 rows,
virtualization, both cached/uncached rows and stable/changing content. It reports
FPS, CPU render mean/p95, actual GL draws, source uploads and allocations over
three trials. Set `KUROT_CACHE_BASELINE` to an extracted Core package directory
to compare its `dist/index.js` against this checkout in the same browser. Each
bundle uses one shared Core instance and the same UI source and fixture. The
report includes the actual GL renderer: headless Chromium can use SwiftShader
software rendering. Set `KUROT_CACHE_HEADED=1` to measure a visible browser and
check its renderer before drawing hardware-performance conclusions. The
Core visual suite's `cache-performance.spec.ts` also measures a fixed bitmap-row
scene. These fixtures do not modify or claim to reproduce a consumer's complete
Shop page.
