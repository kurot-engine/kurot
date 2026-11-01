# deleteSource

Package: `@kurot/core@2.8.0`. Generated from public declarations and JSDoc.

```ts
deleteSource: boolean;
```

Whether dispose() closes an ImageBitmap source; defaults to true.
Set false when borrowing decoded pixels whose owner will close them.
Upload cleanup still runs; image/video src values are cleared independently.

**Default/initializer:** `true`
