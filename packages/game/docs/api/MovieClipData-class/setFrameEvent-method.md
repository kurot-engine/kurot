# setFrameEvent

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
setFrameEvent(frameIndex: number, eventName: string): void;
```

Assign a non-blank event name to a 0-based frame. The clip dispatches it when
that frame is applied. Invalid indices or blank event names throw RangeError.
