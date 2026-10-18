# size

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get size(): number;
set size(value: number);
```

Inherited from `size`; shown with this receiver's substituted types.

Authored font size in logical pixels, initially 30 unless the Core default
was changed before construction. Shrink fitting changes renderedSize, not this
value. This setter does not enforce a finite positive size.
