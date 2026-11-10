# value

Package: `@kurot/ui@5.2.3`. Generated from public declarations and JSDoc.

```ts
get value(): number;
set value(val: number);
```

Current displayed progress. Setting it requests a bounded target; animated
reads follow the display until it reaches that exact target.
Distinct immediate assignments dispatch CHANGE; animation updates do not.
