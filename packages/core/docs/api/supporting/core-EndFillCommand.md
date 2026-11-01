# EndFillCommand

Supporting declaration from `@kurot/core`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
/**
 * Completes the current fill without removing earlier geometry.
 */
export interface EndFillCommand {
    type: PathCommandType.EndFill;
}
```
