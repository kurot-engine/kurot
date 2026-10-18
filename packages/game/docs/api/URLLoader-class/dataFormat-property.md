# dataFormat

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
dataFormat: URLLoaderDataFormat;
```

Result format for the next request; defaults to TEXT. Set before load().
JSON parsing failures dispatch IO_ERROR. SOUND and TEXTURE return owned resource
objects whose lifetime must be managed after loading.

**Default/initializer:** `URLLoaderDataFormat.TEXT`

Related types: [URLLoaderDataFormat](../URLLoaderDataFormat-typealias.md).
