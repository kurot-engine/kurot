# filters

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get filters(): Filter[];
set filters(value: Filter[]);
```

Ordered filter list, initially empty. Assignment copies the list and
updates filter attachment; reassign after changing its membership. Application
resource ownership is not transferred when a filter is attached or removed.

Related types: [Filter](../Filter-class.md).
