# onProgress

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
onProgress(callback: ProgressCallback): void;
```

Adds a persistent listener for GROUP_PROGRESS events from group loads.
This does not track load() and is not limited to the next group. The
wrapper has no removal handle; prefer loadGroup's callback for one batch,
or on()/off() with the same listener when detachable tracking is needed.

Related types: [ProgressCallback](../ProgressCallback-typealias.md).
