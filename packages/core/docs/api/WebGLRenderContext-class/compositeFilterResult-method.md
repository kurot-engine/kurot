# compositeFilterResult

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
compositeFilterResult(filters: Filter[], offscreen: WebGLRenderBuffer): void;
```

Composites an offscreen filter result into the active parent buffer.
Pending work is flushed before sampling and after compositing to prevent
framebuffer feedback and state leakage.

Related types: [Filter](../Filter-class.md), [WebGLRenderBuffer](../WebGLRenderBuffer-class.md).
