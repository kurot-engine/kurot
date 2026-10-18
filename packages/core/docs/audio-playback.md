# Sound playback and continuous loops

Native Sound loads through
Web Audio when available and decodable, with HTMLAudioElement as a fallback. `Sound.type` labels
music/effects; it does not select a different loop implementation.

## Playback contract

```ts
const infinite = sound.play(0, 0);
const once = sound.play(0, 1);
const three = sound.play(1.5, 3);
```

`loops <= 0` repeats indefinitely. Positive values count total plays, so 1 means
once and 3 means three plays. `startTime` is an offset in seconds for the first
play only; repetitions start at zero. The initial partial play counts once,
including an empty initial play when the offset reaches the buffer's end.
Existing fractional counts round upward; positive Infinity is unlimited and
NaN retains the old single-play behavior. Native offset validation is retained.

Web Audio uses one AudioBufferSourceNode with `loopStart = 0` and `loopEnd` equal
to the decoded buffer duration. Repeated plays use `loop = true`; no JavaScript
callback, timeout or new source is needed at each join. Finite playback passes
the initial remaining duration plus the full repetitions to `start()` as total
buffer content. Rendering stops on the audio clock even if the control thread is
busy or the AudioContext is suspended and later resumed.

`position` is seconds within the current iteration, including the first offset.
It wraps with the audio clock, freezes at buffer duration after finite completion
and returns zero after an early manual stop. Finite natural completion dispatches
SOUND_COMPLETE once and disconnects source/gain nodes. `stop()` is idempotent,
suppresses queued completion callbacks and disconnects both nodes. Volume retains
its 0–1 range and does not restart playback.

HTML fallback uses the element's native `loop` for unlimited playback. Finite
fallback playback retains ended-based counting because HTMLAudioElement does not
offer a sample-accurate finite repeat count. Sample-continuous finite looping is
a Web Audio guarantee; fallback transitions depend on browser media behavior.

## Audio assets

Continuous scheduling does not trim silence, repair musical phrasing, remove
waveform discontinuities or apply a crossfade. MP3 encoder delay/padding handling
belongs to the browser decoder. Prepare seamless source material as needed; the
runtime reproduces the decoded samples at their original loop boundary.

## Verification

Unit tests cover counts, offsets, volume, position, completion, cleanup and HTML
fallback. Minified browser tests compare every rendered sample against repeated
decoded PCM at 44.1/48 kHz while holding the control thread. They check both
continuous output and the exact finite stop boundary, including end offsets.

```sh
pnpm build
pnpm test
pnpm exec playwright test --config examples/visual-regression/playwright.config.ts audio-loop.spec.ts
KUROT_AUDIO_FIXTURE=/absolute/path/to/gameplay.mp3 \
  pnpm exec playwright test --config examples/visual-regression/playwright.config.ts audio-loop.spec.ts
```

The optional MP3 remains application-owned and is not copied into the SDK.
