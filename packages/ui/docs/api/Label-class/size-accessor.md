# size

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get size(): number;
set size(value: number);
```

Authored font size in logical pixels, initially 30 unless the Core default
was changed before construction. Shrink fitting changes renderedSize, not this
value. This setter does not enforce a finite positive size.
