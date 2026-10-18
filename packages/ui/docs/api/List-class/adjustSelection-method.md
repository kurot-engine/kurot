# adjustSelection

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
protected adjustSelection(newIndex: number, _add: boolean): void;
```

Extension hook: protected; available to subclasses.

Inherited from `adjustSelection`; shown with this receiver's substituted types.

Adjust the selection index in response to collection mutations without
dispatching events or calling `itemSelected` (egret `adjustSelection`).

The index is mutated silently so that multiple add/remove operations
within a single frame only produce one final commit event when
`commitProperties` runs.
