# percentWidth

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get percentWidth(): number;
set percentWidth(v: number);
```

Width as a percentage of the parent's width (0–100).

Requested percentage of parent width; 100 means full width, not 1. Defaults
to NaN (automatic). BasicLayout gives paired edge constraints precedence.
