# skin

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get skin(): Skin | undefined;
```

Inherited from `skin`; shown with this receiver's substituted types.

Currently attached skin, or undefined. Skin replacement detaches old visuals
and tracked skin watchers; removing the component from the stage retains its
skin. The game still owns its manual listeners, timers and bindings.

Related types: [Skin](../Skin-class.md).
