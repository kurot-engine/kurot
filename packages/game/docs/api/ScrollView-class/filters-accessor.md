# filters

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
get filters(): Filter[];
set filters(value: Filter[]);
```

Inherited from `Sprite.filters`; shown with this receiver's substituted types.

Ordered filter list, initially empty. Assignment copies the list and
updates filter attachment; reassign after changing its membership. Application
resource ownership is not transferred when a filter is attached or removed.

Related types: [Filter](../../../../core/docs/api/Filter-class.md).
