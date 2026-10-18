# removeChild

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
removeChild(child: DisplayObject): DisplayObject | undefined;
```

Inherited from `removeChild`; shown with this receiver's substituted types.

Detaches a direct child and returns it, or returns undefined when absent.
Removal emits display/stage events but does not stop its application callbacks,
remove all listeners, or destroy its textures.

Related types: [DisplayObject](../DisplayObject-class.md).
