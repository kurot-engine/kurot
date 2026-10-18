# cacheAsTexture

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
cacheAsTexture(value: boolean | CacheAsTextureOptions): void;
```

Inherited from `Sprite.cacheAsTexture`; shown with this receiver's substituted types.

Enables a Canvas-rasterized subtree cache, or releases it when value is false.
true uses the default cache options; an options object configures resolution
and scale mode. GPU-only custom effects are not captured by this Canvas path.
Release with false when the owning view no longer needs the cache.

Related types: [CacheAsTextureOptions](../../../../core/docs/api/CacheAsTextureOptions-interface.md).
