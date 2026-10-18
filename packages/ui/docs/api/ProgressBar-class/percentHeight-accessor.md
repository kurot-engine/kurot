# percentHeight

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get percentHeight(): number;
set percentHeight(v: number);
```

Inherited from `percentHeight`; shown with this receiver's substituted types.

Height as a percentage of the parent's height (0–100).

Requested percentage of parent height; 100 means full height, not 1. Defaults
to NaN (automatic). BasicLayout gives paired edge constraints precedence.
