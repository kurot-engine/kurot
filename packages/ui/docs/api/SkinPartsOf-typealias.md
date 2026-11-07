# SkinPartsOf

Package: `@kurot/ui@5.1.0`. Generated from public declarations and JSDoc.

```ts
type SkinPartsOf<TSkin extends string> = TSkin extends keyof SkinPartsMap ? SkinPartsMap[TSkin] : Readonly<Record<string, unknown>>;
```

Resolve the generated skin parts for a skin class name.

Related types: [SkinPartsMap](SkinPartsMap-interface.md).
