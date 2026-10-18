# font

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get font(): BitmapFont | undefined;
set font(value: BitmapFont | undefined);
```

Borrowed BitmapFont, initially undefined (empty layout). Clearing or replacing
it does not dispose font textures. The resource/view owner coordinates font
lifetime across all BitmapText instances that share it.

Related types: [BitmapFont](../BitmapFont-class.md).
