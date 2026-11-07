# dispose

Package: `@kurot/core@3.2.2`. Generated from public declarations and JSDoc.

```ts
dispose(): void;
```

Releases the current upload and owned decoded pixels, then invalidates users.
Coordinate disposal with every Texture sharing this BitmapData. Repeated
calls do not repeat upload deletion or close the same ImageBitmap again.
Cleanup continues after individual failures and throws an AggregateError.
