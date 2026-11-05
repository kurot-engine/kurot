# filterFunction

Package: `@kurot/ui@4.1.0`. Generated from public declarations and JSDoc.

```ts
filterFunction(testFn: (item: unknown) => boolean): void;
```

Filter the collection in place, keeping only items that pass the test.
Dispatches REFRESH after filtering.
Note: items that are filtered out are removed from the source array.
