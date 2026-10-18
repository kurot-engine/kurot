# load

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
load<T = unknown>(name: string): Promise<T>;
```

Load a single resource by name. Returns the cached data.
Rejects for an unknown name, unsupported type or failed load. The type
parameter describes expected data; it does not validate downloaded JSON.
