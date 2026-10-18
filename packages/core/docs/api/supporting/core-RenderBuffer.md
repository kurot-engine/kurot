# RenderBuffer

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
/**
 * Render-buffer state consumed by leaf pipes.
 */
export interface RenderBuffer {
    /**
     * Drawing operations available to the buffer.
     */
    readonly context: RenderContext;
    globalAlpha: number;
    globalMatrix: Matrix;
    offsetX: number;
    offsetY: number;
    saveTransform(): void;
    restoreTransform(): void;
}
```

Related declarations: [RenderContext](../../../../core/docs/api/supporting/core-RenderContext.md), [Matrix](../../../../core/docs/api/Matrix-class.md).
