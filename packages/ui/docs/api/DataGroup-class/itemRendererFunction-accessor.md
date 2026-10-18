# itemRendererFunction

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get itemRendererFunction(): ((item: unknown) => (() => ItemRenderer) | undefined) | undefined;
set itemRendererFunction(value: ((item: unknown) => (() => ItemRenderer) | undefined) | undefined);
```

Optional synchronous per-item renderer-class resolver. An undefined result
falls back to itemRenderer, then ItemRenderer. Resolver exceptions propagate.
