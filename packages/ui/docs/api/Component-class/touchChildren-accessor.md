# touchChildren

Package: `@kurot/ui@5.2.2`. Generated from public declarations and JSDoc.

```ts
get touchChildren(): boolean;
set touchChildren(value: boolean);
```

Whether a hit child remains the input target, true by default. When false,
child hits are retargeted to this container. Descendant geometry is still
tested; this does not change the children's touchEnabled values.
