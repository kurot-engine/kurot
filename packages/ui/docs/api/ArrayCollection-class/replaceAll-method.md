# replaceAll

Package: `@kurot/ui@5.1.0`. Generated from public declarations and JSDoc.

```ts
replaceAll(newSource: T[]): void;
```

Replace all items with a new source. Unlike setting `source`, this does
**not** reset scroll position in the view — individual add/remove events
are dispatched instead.
