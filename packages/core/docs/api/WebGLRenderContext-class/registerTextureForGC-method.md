# registerTextureForGC

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
registerTextureForGC(owner: object, texture: WebGLTexture, token: object): void;
```

Registers `texture` for reclamation once `owner` is garbage-collected,
against `token` (an opaque object the caller keeps around so a later
`unregisterTextureGC(token)` call can cancel this specific registration
before it fires — e.g. when `owner`'s cached texture is replaced).
Backend-agnostic replacement for a pipe holding onto a raw `gl` handle
itself just to call `gl.deleteTexture()` later.
