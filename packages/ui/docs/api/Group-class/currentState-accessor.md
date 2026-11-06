# currentState

Package: `@kurot/ui@5.0.0`. Generated from public declarations and JSDoc.

```ts
get currentState(): string;
set currentState(value: string);
```

Requested view state, initially an empty string. After state initialization,
an unknown state falls back to the first defined state instead of throwing.
