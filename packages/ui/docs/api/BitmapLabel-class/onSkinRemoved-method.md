# onSkinRemoved

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
protected onSkinRemoved(): void;
```

Extension hook: protected; available to subclasses.

Inherited from `onSkinRemoved`; shown with this receiver's substituted types.

Called before the current skin and complete part set are detached/replaced.
Release listeners/bindings installed by onSkinReady() here. Merely removing the
component from the stage does not call this hook; application round resources
need their own cleanup path.
