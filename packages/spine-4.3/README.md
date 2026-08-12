# @kurot/spine-4.3

Spine 4.3 runtime for the Kurot engine.

Ports the [egret-spine](https://github.com/tadazly/egret-spine) adapter to `@kurot/core`,
replacing Egret's `Mesh` / `Texture` / `RES` APIs with their Kurot equivalents.
The Spine runtime itself is provided by the official `@esotericsoftware/spine-core` npm package.

## Installation

```bash
pnpm add @kurot/spine-4.3
```

## Usage

```ts
import { createPlayer } from '@kurot/core';
import {
	SkeletonAnimation,
	KurotAssetManager,
	SkeletonBinary,
	AtlasAttachmentLoader,
	TextureAtlas,
} from '@kurot/spine-4.3';

// 1. Create Kurot player
const app = createPlayer({ canvas, frameRate: 60, contentWidth: 640, contentHeight: 480 });

// 2. Load assets
const mgr = new KurotAssetManager('assets/spine/');
mgr.loadTextureAtlas('hero.atlas');
mgr.loadBinary('hero.skel');

// 3. Poll until complete
function waitForLoad() {
	if (!mgr.isLoadingComplete()) {
		requestAnimationFrame(waitForLoad);
		return;
	}
	if (mgr.hasErrors()) {
		console.error(mgr.getErrors());
		return;
	}

	// 4. Build skeleton data
	const atlas = mgr.require('hero.atlas') as TextureAtlas;
	const binary = new SkeletonBinary(new AtlasAttachmentLoader(atlas));
	binary.scale = 0.5;
	const skelData = binary.readSkeletonData(mgr.require('hero.skel') as Uint8Array);

	// 5. Create display object and add to stage
	const hero = new SkeletonAnimation(skelData);
	hero.x = 320;
	hero.y = 480;
	app.stage.addChild(hero);
	app.start();

	// 6. Play animations
	hero.play('walk', 0); // loop forever
	hero.play('attack', 1); // play once
	hero.setMix(0.2, 'walk', 'attack'); // cross-fade

	// Promise-based sequencing
	const track = hero.start(0);
	track.add('idle', 0);
	await track.waitPlayEnd();
	track.add('run', 3);
}
requestAnimationFrame(waitForLoad);
```

## API

### `SkeletonAnimation`

The main display object. Extends `Sprite` from `@kurot/core`.

| Method                                  | Description                                                         |
| --------------------------------------- | ------------------------------------------------------------------- |
| `play(anim, loop, trackID?, listener?)` | Play an animation. `loop=0` = loop forever, `loop=N` = play N times |
| `playDefault(anim?, loop, trackID?)`    | Play first animation if `anim` omitted                              |
| `playList(animList, loop, trackID?)`    | Queue multiple animations                                           |
| `playAll(loop, trackID?)`               | Queue all animations in skeleton data                               |
| `playRandom(trackID?)`                  | Play a random animation                                             |
| `start(trackID?)`                       | Reset pose and return a new `Track` for the given track             |
| `stop(trackID)`                         | Clear a single track                                                |
| `stopAll(reset?)`                       | Clear all tracks; optionally reset to setup pose                    |
| `setMix(time, from?, to?)`              | Set cross-fade mix time                                             |
| `setSkinByName(name)`                   | Switch skin and reset to setup pose                                 |
| `getAllSkinNames()`                     | List all skin names                                                 |
| `setTimeScale(scale)`                   | Global time scale for all animations                                |
| `flipX` / `flipY`                       | Mirror the skeleton                                                 |

### `Track`

Returned by `SkeletonAnimation.start()`. Manages an animation queue on a single Spine track.

| Method                       | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `add(name, loop, listener?)` | Append an animation to the queue                  |
| `setToLastFrame()`           | Jump the track entry to its last frame            |
| `waitPlayStart()`            | Promise — resolves when the animation starts      |
| `waitPlayEnd()`              | Promise — resolves when all loops finish          |
| `waitLoopStart()`            | Promise — resolves at the start of each loop      |
| `waitLoopEnd()`              | Promise — resolves at the end of each loop        |
| `waitInterrupt()`            | Promise — resolves when the track is interrupted  |
| `waitTrackEnd()`             | Promise — resolves when the queue is exhausted    |
| `waitEvent()`                | Promise — resolves on the next Spine frame event  |
| `waitNamedEvent(name)`       | Promise — resolves when a named frame event fires |

### `KurotAssetManager`

Loads Spine assets using `@kurot/core`'s `HttpRequest` and `ImageLoader`.

| Method                                     | Description                                        |
| ------------------------------------------ | -------------------------------------------------- |
| `loadTextureAtlas(path, success?, error?)` | Load `.atlas` + page textures                      |
| `loadBinary(path, success?, error?)`       | Load `.skel` binary                                |
| `loadJson(path, success?, error?)`         | Load `.json` skeleton                              |
| `loadText(path, success?, error?)`         | Load raw text                                      |
| `isLoadingComplete()`                      | Returns true when all pending loads finish         |
| `hasErrors()`                              | Returns true if any load failed                    |
| `getErrors()`                              | Map of path → error message                        |
| `require(path)`                            | Get a loaded asset, throws if not found            |
| `get(path)`                                | Get a loaded asset, returns undefined if not found |

## Spine version compatibility

The Spine editor version must match the runtime version. This package uses
`@esotericsoftware/spine-core ~4.3.0` and therefore stays on the 4.3.x runtime
line. Export your skeletons from **Spine 4.3**.

Spine's binary/JSON export formats are not guaranteed to be backwards
compatible across major/minor versions — assets exported from Spine 4.2 may
fail to load (or load with corrupted data) on a 4.3 runtime, and vice versa.
If you are migrating from a Spine 4.2 runtime, re-export your `.skel`/`.json`
files from Spine 4.3 before switching to `@kurot/spine-4.3`.

### Migrating from 4.2

Spine 4.3 restructured `Skeleton`/`Slot` around a `Pose`-based model
(current pose vs. setup pose are now separate objects). If you call the
Spine runtime APIs directly (rather than only through `SkeletonAnimation`),
note the following renames:

| 4.2                              | 4.3                                             |
| -------------------------------- | ----------------------------------------------- |
| `skeleton.setToSetupPose()`      | `skeleton.setupPose()`                          |
| `skeleton.setSlotsToSetupPose()` | `skeleton.setupPoseSlots()`                     |
| `skeleton.setSkinByName(name)`   | `skeleton.setSkin(name)`                        |
| `skeleton.drawOrder` (array)     | `skeleton.drawOrder.appliedPose` (array)        |
| `slot.getAttachment()`           | `slot.appliedPose.attachment`                   |
| `slot.color`                     | `slot.appliedPose.color`                        |
| `attachment.region` / `.uvs`     | `attachment.sequence.regions[i]` / `.getUVs(i)` |
| `clipper.clipEndWithSlot(slot)`  | `clipper.clipEnd(slot)`                         |
| `clipper.clipTriangles(...)`     | `clipper.clipTrianglesUnpacked(...)`            |

`SkeletonAnimation`, `Track`, and `KurotAssetManager` public APIs are
unaffected — only code touching `Skeleton`/`Slot`/`SkeletonClipping`
directly needs to change.

## Running the example

```bash
pnpm example
```

Opens a Vite dev server at `http://localhost:5173` with a spineboy demo.
Place your Spine 4.3 assets in `example/assets/`.

## License

MIT (adapter layer) — Spine runtime is © Esoteric Software LLC,
see [Spine Runtimes License](https://esotericsoftware.com/spine-runtimes-license).
