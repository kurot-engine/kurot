# layout

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get layout(): LayoutBase | undefined;
set layout(value: LayoutBase | undefined);
```

Inherited from `layout`; shown with this receiver's substituted types.

Layout instance, initially undefined. First initialization installs BasicLayout
if none was assigned. Replacement detaches the old layout's target and attaches
the new one; do not share one layout instance between simultaneous groups.

Related types: [LayoutBase](../LayoutBase-class.md).
