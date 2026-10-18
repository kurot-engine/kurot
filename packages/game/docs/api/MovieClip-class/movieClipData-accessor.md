# movieClipData

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
get movieClipData(): MovieClipData | undefined;
set movieClipData(value: MovieClipData | undefined);
```

Borrowed animation data, initially undefined. Assigning data stops playback,
resets the frame/range and displays the first frame. Neither replacement nor
stage removal disposes shared frame textures or the external animation scheduler.

Set the frame data source and reset the clip to its first frame.
Any active playback is stopped before the source is replaced.

Related types: [MovieClipData](../MovieClipData-class.md).
