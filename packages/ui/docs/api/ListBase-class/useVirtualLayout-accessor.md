# useVirtualLayout

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get useVirtualLayout(): boolean;
set useVirtualLayout(value: boolean);
```

Inherited from `useVirtualLayout`; shown with this receiver's substituted types.

Whether a supported layout creates/reuses only visible renderers; initially
false. Reads the active layout's setting when present. Data indices remain
logical item indices and differ from the current display-child indices.
