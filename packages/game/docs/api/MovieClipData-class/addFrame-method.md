# addFrame

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
addFrame(texture: Texture | undefined, duration: number, label?: string): void;
```

Append a borrowed texture and positive, finite duration in milliseconds.
Undefined texture creates a blank frame. Textures remain owned by their resource
owner; appending does not copy or dispose them.

**Parameter texture:** Borrowed texture, or undefined for a blank frame.

**Parameter duration:** External scheduling metadata; invalid values throw RangeError.

**Parameter label:** Optional label for this new 0-based index. An empty string is
ignored; a truthy but whitespace-only label throws RangeError.

Related types: [Texture](../../../../core/docs/api/Texture-class.md).
