# removeContent

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
removeContent(): void;
```

Detach the current content without disposing its textures or application
listeners. This does not cancel the view's touch/inertia/animation state;
removing the ScrollView itself from the stage cancels that scrolling work.
