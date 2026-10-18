# play

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
play(startTime: number, loops: number): SoundChannel;
```

Starts a new independent SoundChannel at startTime seconds (default 0).
loops defaults to 0: non-positive means unlimited; positive counts total plays,
including the first partial play. Repeats restart at zero. Web Audio finite
loops use its audio clock; finite HTML fallback is browser-event timed.
Before loading completes, dispatches IO_ERROR and returns an inert channel.
Provide a valid non-negative offset; browser playback/start errors are not
converted to a returned Promise. Retain and stop channels when their view exits.

**Default startTime:** `0`

**Default loops:** `0`

Related types: [SoundChannel](../SoundChannel-class.md).
