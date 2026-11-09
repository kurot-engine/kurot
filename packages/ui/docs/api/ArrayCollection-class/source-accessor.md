# source

Package: `@kurot/ui@5.2.0`. Generated from public declarations and JSDoc.

```ts
get source(): T[];
set source(value: T[]);
```

Live backing array, initially the supplied array or an empty array. Assignment
retains the array and dispatches RESET. Direct array mutation sends no events;
use collection methods or refresh() to notify views.
