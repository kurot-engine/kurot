# source

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get source(): unknown[];
set source(value: unknown[]);
```

Live backing array, initially the supplied array or an empty array. Assignment
retains the array and dispatches RESET. Direct array mutation sends no events;
use collection methods or refresh() to notify views.
