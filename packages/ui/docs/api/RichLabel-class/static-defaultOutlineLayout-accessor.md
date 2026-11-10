# static defaultOutlineLayout

Package: `@kurot/ui@5.3.0`. Generated from public declarations and JSDoc.

```ts
static get defaultOutlineLayout(): OutlineLayout;
static set defaultOutlineLayout(value: OutlineLayout);
```

Startup default for subsequently constructed RichLabels. Existing instances
keep their captured policy. A construction UIContext can override this
shared-runtime default; use explicit context policies for isolated apps.

Related types: [OutlineLayout](../OutlineLayout-typealias.md).
