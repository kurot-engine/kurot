# advanceFrame

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
advanceFrame(): void;
```

Advance to the next animation frame.

This is the external playback entry point. It advances exactly one frame,
performs loop/completion handling, and dispatches frame events. It does
nothing while stopped.
