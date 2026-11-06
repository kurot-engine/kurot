# maxTouches

Package: `@kurot/core@3.1.0`. Generated from public declarations and JSDoc.

```ts
get maxTouches(): number;
set maxTouches(value: number);
```

Touch limit read when TouchHandler is created, initially 99. Later changes
notify onMaxTouchesChanged(); the base hook does not update an existing handler.
