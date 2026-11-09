# adjustSelection

Package: `@kurot/ui@5.1.4`. Generated from public declarations and JSDoc.

```ts
protected adjustSelection(newIndex: number, _add: boolean): void;
```

Extension hook: protected; available to subclasses.

Adjust the selection index in response to collection mutations without
dispatching events or calling `itemSelected`.

The index is mutated silently so that multiple add/remove operations
within a single frame only produce one final commit event when
`commitProperties` runs.
