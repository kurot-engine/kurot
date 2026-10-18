# currentState

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get currentState(): string;
set currentState(value: string);
```

Inherited from `currentState`; shown with this receiver's substituted types.

Requested view state, initially an empty string. After state initialization,
an unknown state falls back to the first defined state instead of throwing.
