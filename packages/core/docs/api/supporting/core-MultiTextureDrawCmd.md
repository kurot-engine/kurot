# MultiTextureDrawCmd

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
// ── MultiTextureDrawCmd ───────────────────────────────────────────────────────
/**
 * A draw command that references a multi-texture batch.
 */
export interface MultiTextureDrawCmd {
    readonly isMulti: true;
    count: number;
    readonly textures: WebGLTexture[];
    textureCount: number;
}
```
