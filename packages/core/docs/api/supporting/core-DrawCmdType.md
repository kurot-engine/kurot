# DrawCmdType

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
// ── DrawCmdType ───────────────────────────────────────────────────────────────
export const enum DrawCmdType {
    TEXTURE = 0,
    RECT = 1,
    PUSH_MASK = 2,
    POP_MASK = 3,
    BLEND = 4,
    RESIZE_TARGET = 5,
    CLEAR_COLOR = 6,
    ACT_BUFFER = 7,
    ENABLE_SCISSOR = 8,
    DISABLE_SCISSOR = 9,
    SMOOTHING = 10,
    MULTI_TEXTURE = 11
}
```
