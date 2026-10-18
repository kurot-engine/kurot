# useVirtualLayout

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get useVirtualLayout(): boolean;
set useVirtualLayout(value: boolean);
```

Whether a supported layout creates/reuses only visible renderers; initially
false. Reads the active layout's setting when present. Data indices remain
logical item indices and differ from the current display-child indices.
