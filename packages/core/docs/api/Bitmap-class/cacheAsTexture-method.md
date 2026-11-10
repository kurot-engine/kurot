# cacheAsTexture

Package: `@kurot/core@3.5.0`. Generated from public declarations and JSDoc.

```ts
cacheAsTexture(value: boolean | CacheAsTextureOptions): void;
```

Inherited from `cacheAsTexture`; shown with this receiver's substituted types.

Enables a subtree texture cache, or releases it when value is false.
WebGL captures into a persistent GPU target; Canvas uses a bitmap surface.
true uses defaults; an options object configures resolution and scale mode.
GPU-only descendant effects are captured on the WebGL backend.
Release with false when the owning view no longer needs the cache.

Related types: [CacheAsTextureOptions](../CacheAsTextureOptions-interface.md).
