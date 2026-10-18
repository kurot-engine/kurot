# replaceAll

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
replaceAll(newSource: unknown[]): void;
```

Replace all items with a new source. Unlike setting `source`, this does
**not** reset scroll position in the view — individual add/remove events
are dispatched instead.
