# selected

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get selected(): boolean;
set selected(value: boolean);
```

Selection flag, initially false. Assignment updates view state and dispatches
a property change, but does not dispatch the user CHANGE event itself.
