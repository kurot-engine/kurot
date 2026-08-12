# @blakron/game

Game extensions for [@blakron/core](https://github.com/irwinmc/blakron-core): chainable Tween animation, externally scheduled MovieClip playback, and common UI/network helpers.

> **Stable (1.0.1).** Requires `@blakron/core@^1.0.3`. Targets ES2022 + evergreen browsers, same as core.

## Installation

```bash
pnpm add @blakron/game @blakron/core
```

`@blakron/game` declares `@blakron/core` as a regular dependency, so it is installed automatically; listing it explicitly is recommended so you control the resolved core version.

For the full list of changes in this release, see [CHANGELOG.md](./CHANGELOG.md).

## Tween

`Tween` owns its ticker registration automatically. Create a tween with `Tween.get(target)` and append steps; it begins on the next engine tick.

### Basic animation

```ts
import { Ease, Tween } from '@blakron/game';

Tween.get(sprite)
	.to({ x: 320, alpha: 0.5 }, 400, Ease.cubicOut)
	.wait(120)
	.to({ x: 40, alpha: 1 }, 300, Ease.sineInOut)
	.call(() => console.log('animation finished'));
```

All durations are milliseconds. `to()` captures the target's current values when its step starts; `from()` applies the provided starting values and animates back to the captured values.

```ts
Tween.get(panel)
	.from({ alpha: 0, y: panel.y + 24 }, 220, Ease.cubicOut)
	.set({ visible: true });
```

### Repeat and yoyo

`repeat` is the number of **additional** playback cycles. `repeat: 0` plays once, `repeat: 2` plays three times in total, and `repeat: -1` repeats forever. With `yoyo`, every alternate cycle plays in reverse.

```ts
// Infinite pulse: 1 → 1.12 → 1 → ...
Tween.get(icon, { repeat: -1, yoyo: true, ease: Ease.sineInOut }).to({ scaleX: 1.12, scaleY: 1.12 }, 180);

// `loop: true` remains available as the compatibility alias for repeat: -1.
Tween.get(cursor, { loop: true }).to({ alpha: 0.2 }, 300).to({ alpha: 1 }, 300);
```

`call()` and `set()` run only during the forward pass; yoyo does not invoke them again while reversing.

### Await completion

A Tween is thenable. Await it when sequencing asynchronous game/UI work:

```ts
async function closeDialog(dialog: { alpha: number }): Promise<void> {
	await Tween.get(dialog).to({ alpha: 0 }, 180, Ease.quadIn);
}
```

The promise resolves when the tween completes or is removed, so teardown code does not need a separate completion path.

### Pause, seek, and cleanup

```ts
const tween = Tween.get(card, { paused: true }).to({ x: 300 }, 500).wait(100).to({ rotation: 15 }, 150);

// Start or pause one tween.
tween.resume();
tween.pause();

// Apply the sequence as if 275ms had elapsed. Callbacks are not run while seeking.
tween.setPosition(275);

// Manage every active tween targeting an object.
Tween.pauseTweens(card);
Tween.resumeTweens(card);
Tween.removeTweens(card);

// Manage all active tweens.
Tween.pauseAll();
Tween.resumeAll();
Tween.removeAllTweens();
```

### Tween options

| Option                             | Description                                                       |
| ---------------------------------- | ----------------------------------------------------------------- |
| `repeat?: number`                  | Additional cycles; `-1` repeats forever.                          |
| `yoyo?: boolean`                   | Reverse every alternate cycle.                                    |
| `loop?: boolean`                   | Compatibility alias for infinite repeat when `repeat` is omitted. |
| `ease?: EaseFunction`              | Default easing for property steps.                                |
| `paused?: boolean`                 | Create the tween paused.                                          |
| `position?: number`                | Apply this forward-sequence position on the first active tick.    |
| `ignoreGlobalPause?: boolean`      | Continue while `Tween.pauseAll()` is active.                      |
| `onChange?: (tween) => void`       | Runs after each update, including the final one.                  |
| `onLoopComplete?: (tween) => void` | Runs after each cycle that will repeat.                           |

Common easing functions include `Ease.linear`, `Ease.sineInOut`, `Ease.cubicOut`, `Ease.backOut`, `Ease.elasticOut`, `Ease.bounceOut`, and `Ease.cubicBezier(...)`.

## MovieClip

`MovieClip` is a display object for sequence-frame animation. It **does not own a ticker or calculate elapsed time**. Your game loop decides when a logical animation frame has elapsed, then calls `advanceFrame()` once for each active clip.

This keeps the engine's animation clock centralized and makes frame stepping explicit.

### Simple texture array

For a simple fixed-rate sequence, build data directly from textures:

```ts
import { MovieClip, MovieClipData } from '@blakron/game';

const data = MovieClipData.fromTextureArray([idle1, idle2, idle3, idle4], 12);
const clip = new MovieClip(data);
clip.play(-1);
```

`data.frameRate` is timing metadata for your external scheduler. `MovieClipData.addFrame()` is the lower-level API used by resource adapters or dynamically assembled animations.

### Egret MovieClip JSON and atlas texture

Use `MovieClipDataFactory` for JSON generated by Egret's MovieClip exporter. It parses the known top-level `mc` / `res` format and uses core's `SpriteSheet` internally; it is not a generic JSON parser.

```ts
import { MovieClip, MovieClipDataFactory } from '@blakron/game';

const factory = new MovieClipDataFactory(egretMovieClipDataSet, atlasTexture);
const data = factory.generateMovieClipData('hero_run');
if (!data) throw new Error('MovieClip "hero_run" was not found');

const clip = new MovieClip(data);
clip.play(-1);
```

The factory handles atlas regions, per-frame `x`/`y` offsets, frame `duration`, labels, frame events, and generated-data caching.

```ts
factory.enableCache = false; // Generate fresh data on each request.
factory.clearCache();
```

### External frame scheduler

Call `advanceFrame()` from one centralized scheduler. The example below drives clips at 12 logical frames per second even if `ENTER_FRAME` runs at a different frequency or a render frame stalls.

```ts
import { Event, getTimer } from '@blakron/core';

const playingClips = new Set<MovieClip>([clip]);
const frameDuration = 1000 / data.frameRate;
let elapsed = 0;
let lastTime = getTimer();

stage.addEventListener(Event.ENTER_FRAME, () => {
	const now = getTimer();
	elapsed += now - lastTime;
	lastTime = now;

	while (elapsed >= frameDuration) {
		elapsed -= frameDuration;
		for (const movieClip of playingClips) {
			movieClip.advanceFrame();
		}
	}
});
```

Use a separate accumulator when clips intentionally have different frame rates, or normalize exported animations to a shared logical frame rate.

### Playback, labels, and events

```ts
import { MovieClipEvent } from '@blakron/game';

clip.addEventListener(MovieClipEvent.FRAME_CHANGE, () => {
	console.log('current frame:', clip.currentFrame);
});
clip.addEventListener(MovieClipEvent.LOOP_COMPLETE, () => console.log('cycle complete'));
clip.addEventListener(MovieClipEvent.COMPLETE, () => console.log('playback complete'));

// -1 loops forever; a positive number is the total number of plays.
clip.play(3);

// Egret JSON labels play their inclusive start/end range.
clip.gotoAndPlay('attack', 2);

// Numeric frames are 1-based. Manual navigation always stops playback.
clip.gotoAndStop(5);
clip.prevFrame();
clip.nextFrame();
```

For programmatically assembled data, label ranges and frame events use 0-based indices:

```ts
const data = new MovieClipData();
data.addFrame(attackStart, 1000 / 12);
data.addFrame(attackHit, 1000 / 12);
data.addFrame(attackEnd, 1000 / 12);
data.setFrameLabel('attack', 0, 2);
data.setFrameEvent(1, 'hit');
```

| MovieClip member                        | Description                                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `play(playTimes?)`                      | Start/resume playback. `-1` loops forever; a positive number is total plays; `0` keeps the current setting. |
| `advanceFrame()`                        | Advance one externally scheduled logical frame.                                                             |
| `stop()`                                | Stop on the current frame.                                                                                  |
| `gotoAndPlay(frameOrLabel, playTimes?)` | Jump and start a new playback session; a label uses its declared range.                                     |
| `gotoAndStop(frameOrLabel)`             | Jump and stop.                                                                                              |
| `prevFrame()` / `nextFrame()`           | Manual one-frame navigation; both stop playback.                                                            |
| `currentFrame`                          | Current 1-based frame number.                                                                               |
| `currentFrameLabel` / `currentLabel`    | Exact or nearest preceding label.                                                                           |

## Other modules

| Export                                     | Purpose                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `TweenGroup`                               | Manage a named group of Tweens with `pause()`, `resume()`, and `removeAll()`. |
| `ScrollView` / `ScrollPolicy`              | Inertial scroll container and policy enum.                                    |
| `URLLoader` / `URLRequest`                 | Resource loading and request helpers.                                         |
| `ParticleSystem` / `GravityParticleSystem` | Particle effect display systems.                                              |

## License

MIT
