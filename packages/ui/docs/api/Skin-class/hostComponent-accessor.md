# hostComponent

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get hostComponent(): Component<string> | undefined;
set hostComponent(value: Component<string> | undefined);
```

Attached host, initially undefined and managed by Component. Host changes
undo old state overrides and update host bindings. They do not dispose shared
textures or arbitrary listeners owned by the application.

Related types: [Component](../Component-class.md).
