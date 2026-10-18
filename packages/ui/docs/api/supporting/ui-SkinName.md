# SkinName

Supporting declaration from `@kurot/ui`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
type SkinName = string | (new () => Skin) | Skin | undefined;
```

Related declarations: [Skin](../../../../ui/docs/api/Skin-class.md).
