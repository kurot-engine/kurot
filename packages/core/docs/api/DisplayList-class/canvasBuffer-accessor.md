# canvasBuffer

Package: `@kurot/core@3.5.1`. Generated from public declarations and JSDoc.

```ts
get canvasBuffer(): CanvasBuffer;
set canvasBuffer(value: CanvasBuffer);
```

Canvas fallback storage, allocated only on first access. WebGL captures
keep their own framebuffer without allocating this Canvas surface.

Related types: [CanvasBuffer](../CanvasBuffer-class.md).
