# viewport

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get viewport(): IViewport | undefined;
set viewport(value: IViewport | undefined);
```

Attached content viewport, initially undefined. Setting it reparents the
viewport and enables its scrolling clip. Replacement/undefined detaches old
viewport handlers, stops inertia and disables its clip, without disposing its
data, renderers or textures. Stage removal stops gestures, inertia and the
scrollbar timer but retains viewport subscriptions for reuse.

Related types: [IViewport](../IViewport-interface.md).
