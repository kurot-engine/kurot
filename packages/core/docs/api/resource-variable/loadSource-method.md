# loadSource

Package: `@kurot/core@3.6.0`. Generated from public declarations and JSDoc.

```ts
loadSource<T = unknown>(name: string, urlType?: string): Promise<T>;
```

Load a name or frame through its registered owner. If no definition
exists and urlType is supplied, load the exact source as a URL using
that analyzer. get(), destroy() and concurrent requests use that same
source, independent of transport version parameters. A declared resource
failure never falls back to fetching its name as a URL.
