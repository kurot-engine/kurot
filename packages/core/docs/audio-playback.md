# Sound playback and continuous loops

Core 2.5.4 is published, verified on npm on 2026-10-12, including latest, download,
registry integrity and generated modules matching the tested build. It fixes
continuous Web Audio looping; published Core 2.5.3 lacks this correction.
SDK dependency ranges and development locks are unchanged. Native Sound loads through
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

## Audio assets and adoption

Continuous scheduling does not trim silence, repair musical phrasing, remove
waveform discontinuities or apply a crossfade. MP3 encoder delay/padding handling
belongs to the browser decoder. Prepare seamless source material as needed; the
runtime reproduces the decoded samples at their original loop boundary.

Applications adopt published 2.5.4 through their Core installation/
lock and rebuild. Compatible ranges such as `^2.5.3` already accept it; exact
Core pins require an explicit declaration update. Existing Core 2.x peers,
including UI 3.6.0's ^2.5.2, accept 2.5.4 without new SDK versions or raised peer
minima. Development lock adoption is optional. UI, Game, DragonBones, Spine,
runtime, CLI and the document kernel have no API migration.
Editor 0.28.5, Reskin, the selected Tentax/MilfMaster templates and demo/game
examples adopt registry 2.5.4 with matching app locks and rebuilt outputs. Other
SDK development and independent Reskin project installations retain their own
baselines. Isolated verification does not edit application sources or audio assets.

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

On 2026-10-12, the build and all 941 unit tests pass, including 41 audio tests;
all 22 minified browser checks pass. Tentax's gameplay.mp3 decodes to 2,016,000
frames at 44.1 kHz (45.714285714 seconds). Unlimited and two-play rendering insert
zero missing frames; the maximum difference from directly repeated decoded PCM
after the 0.6 gain is 4.77e-8. Finite output stops at the exact expected boundary.
An isolated minified bundle of Tentax's unchanged SoundMusicManager with built
checkout Core crosses the real-time music boundary on one source, even with a
200 ms control-thread stall at the join. The verification output is muted.

After registry adoption, Tentax minified release 261012182738 passes the same
unlimited/two-play MP3 sample comparisons using its generated Core chunk and
copied runtime MP3. It uses one looping source, inserts zero missing frames,
retains the 4.77e-8 maximum gain-rounding difference and stops finite output
at the exact boundary. Application source audio and authored Skins are retained.
