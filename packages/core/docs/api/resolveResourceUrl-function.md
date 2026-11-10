# resolveResourceUrl

Package: `@kurot/core@3.4.0`. Generated from public declarations and JSDoc.

```ts
resolveResourceUrl(input: string | URL): string;
```

Resolve a local file below the page's resource/ directory using the release
build number emitted by the CLI. Available before createPlayer, including
project font/style loading. Without build metadata, return the input unchanged.

Existing query parameters and fragments are preserved; v is replaced once.
External origins, APIs outside resource/, directories, data/blob URLs and
JavaScript modules retain their original URLs. Native fetch/FontFace callers
can use this function explicitly; Core's resource transports use it directly.

Available since Core 2.7.0; resource metadata requires CLI >= 3.8.1 within 3.x.
