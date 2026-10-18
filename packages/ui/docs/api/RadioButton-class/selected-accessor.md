# selected

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get selected(): boolean;
set selected(value: boolean);
```

Selection flag, initially false. Assignment updates view state and dispatches
a property change, but does not dispatch the user CHANGE event itself.

Keeps the group's selection in sync. Programmatic changes use
`fireChange=false` (no `Event.CHANGE`); interactive changes go through
`buttonReleased`, which dispatches `CHANGE` separately.
