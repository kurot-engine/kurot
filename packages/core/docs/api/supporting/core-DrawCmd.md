# DrawCmd

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
// ── DrawCmd ───────────────────────────────────────────────────────────────────
export interface DrawCmd {
    type: DrawCmdType;
    count: number;
    texture?: WebGLTexture;
    filter?: Filter;
    value: string;
    buffer?: WebGLRenderBuffer;
    width: number;
    height: number;
    textureWidth: number;
    textureHeight: number;
    smoothing: boolean;
    x: number;
    y: number;
    multiCmd?: MultiTextureDrawCmd;
}
```

Related declarations: [DrawCmdType](../../../../core/docs/api/supporting/core-DrawCmdType.md), [Filter](../../../../core/docs/api/Filter-class.md), [WebGLRenderBuffer](../../../../core/docs/api/WebGLRenderBuffer-class.md), [MultiTextureDrawCmd](../../../../core/docs/api/supporting/core-MultiTextureDrawCmd.md).
