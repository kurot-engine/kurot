# itemRendererFunction

Package: `@kurot/ui@5.0.0`. Generated from public declarations and JSDoc.

```ts
get itemRendererFunction(): ((item: T | undefined) => (() => ItemRenderer<string, T>) | undefined) | undefined;
set itemRendererFunction(value: ((item: T | undefined) => (() => ItemRenderer<string, T>) | undefined) | undefined);
```

Optional synchronous per-item renderer-class resolver. An undefined result
falls back to itemRenderer, then ItemRenderer. Resolver exceptions propagate.
