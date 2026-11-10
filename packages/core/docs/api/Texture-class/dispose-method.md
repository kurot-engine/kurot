# dispose

Package: `@kurot/core@3.5.1`. Generated from public declarations and JSDoc.

```ts
dispose(): void;
```

Detaches bitmapData and disposes it when disposeBitmapData is true (default).
Set that flag to false for a non-owning view of a shared source. Stored frame
dimensions remain available after detachment; no pixels can be drawn from them.
