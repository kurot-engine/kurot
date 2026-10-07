# @kurot/dragonbones

Version **0.1.0**. A standalone ESM DragonBones **5.7.000** runtime and native
Kurot adapter. The only runtime peer is `@kurot/core ^2.1.1`; development uses
published Core 2.2.0 without local overrides. UI and Game are not required.

Supports JSON / DBDT skeletons, texture atlases, rotated and trimmed regions,
weighted and unweighted mesh deformation, nested armatures, animation events,
sound-event forwarding and Core ticker updates. Sound events are notifications;
the application owns audio playback.

## Installation

```sh
pnpm add @kurot/dragonbones@^0.1.0 @kurot/core@^2.2.0
```

Core 2.1.1 is the minimum supported version. Core 2.2.0 also satisfies the peer
range, and is required when the application uses UI 3.2.0's BitmapLabel.
The npm package contains runtime code, declarations, documentation and licenses.

For local development, build this package and install it from the consumer's
project directory:

```sh
pnpm add @kurot/dragonbones@file:../Kurot/packages/dragonbones
```

Adjust the relative path to the consumer's location. Alternatively, run
`pnpm pack --out /tmp/kurot-dragonbones-0.1.0.tgz` in this package and install
the resulting tarball.

## Usage

```ts
import { BitmapData, Sprite, Texture } from '@kurot/core';
import { KurotFactory, dragonBones } from '@kurot/dragonbones';

const root = new Sprite();
const factory = new KurotFactory();
const [skeleton, atlas] = await Promise.all([
	fetch('/actor_ske.dbbin').then(response => response.arrayBuffer()),
	fetch('/actor_tex.json').then(response => response.json()) as Promise<unknown>,
]);
const image = new Image();
image.src = '/actor_tex.png';
await image.decode();
const texture = new Texture();
texture.setBitmapData(new BitmapData(image));
factory.parseSkeleton(skeleton, 'actor');
factory.parseAtlas(atlas, texture, 'actor');
const display = factory.buildArmatureDisplay('Armature', 'actor', '', 'actor');
if (!display) throw new Error('Armature is missing.');
root.addChild(display);
display.addDBEventListener(dragonBones.EventObject.COMPLETE, event => {
	console.log(event.animationName);
});
display.animation.play('idle');

// Add root to an already running Kurot Player.
// When leaving the scene:
// display.dispose();
// factory.dispose();
// texture.dispose();
```

Parse JSON skeletons into objects before passing them to `parseSkeleton`; pass
a complete ArrayBuffer for binary skeletons. `buildArmatureDisplay` returns a
KurotArmatureDisplay that can be added directly to the display tree. Use armature
and animation names from the actual assets.

## Clock and disposal

- `autoUpdate` defaults to true. The first root armature registers one Core
  ticker callback; disposing the last root removes it. The application must
  start the Kurot Player's ticker.
- For manual updates, use `new KurotFactory({ autoUpdate: false })` and
  `factory.advanceTime(elapsedSeconds)`. Drive a factory through one clock.
- `advanceTime(0)` drains runtime recycling queues. Upstream WorldClock does
  not update armature poses for a zero delta.
- `display.dispose()` releases its armature and removes it from the factory
  clock. Nested armatures are released with the parent. Removing a display
  from the display tree alone does not stop its animation.
- `factory.dispose()` releases its root armatures, caches and event bridge.
  Repeated calls and disposal from animation callbacks are safe.
- Atlas pages are borrowed. The factory does not release the caller's Texture
  or BitmapData. A cropped Texture view cannot be used as an atlas page.
- `clear(true)` throws while factory-managed root armatures remain. Individual
  cache removal, `clear(false)` and inherited `buildArmature` are lower-level
  upstream APIs whose lifetime is managed by the caller.

Listeners receive a DragonBonesEvent. Its name, time and animationName are
stable scalar snapshots. eventObject / event.data refer to an upstream pooled
event and are valid only during the synchronous callback. thisObject is optional;
remove a listener with the same function and object. Core addEventListener is
also available, with caller-managed listener lifetime.

## Rendering and validation scope

Normal, Add and Erase blending are supported. Other DragonBones blend modes
render as Normal, matching the original Egret adapter's supported range.
RGB multipliers use Kurot tint; color offsets and RGB factors outside 0–1 use
ColorMatrixFilter. These filters run only in WebGL; Canvas 2D skips GPU filters.

The adapter has no Egret global, native-platform WASM wrapper, Egret batch
switch or debug-bone drawing. Animation, object-pool and constraint algorithms
come from the official runtime. Surface mesh mapping is implemented, but has
no separate Surface image-regression baseline.

All 159 armatures and 397 animations from the supplied MilfMaster project were
verified with skeleton data format 5.5. Verification includes frame-by-frame
numeric checks and browser checks of one UI animation. Pixel comparisons of
all characters against the old Egret renderer remain outside that scope.
See [verification](docs/verification.md) for environments and results.

## Source and development

Maintained in the Kurot repository at `packages/dragonbones`. Run commands from
this package directory:

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm example
pnpm verify:project /path/to/armature
```

Official source is pinned to [DragonBonesJS commit 64b6c69](https://github.com/DragonBones/DragonBonesJS/tree/64b6c69ae35777c2404be68c9192e2c56906079e/DragonBones).
The general-purpose dragonBones namespace is also exported from
`@kurot/dragonbones/runtime`; both entries share the same runtime constructors.

Official TypeScript lives in src/runtime and retains the core, geom, model,
armature, animation, event, parser and factory directory structure. Namespaces
were converted to ESM. Pool-initialized fields use definite-assignment
assertions; inherited members declare override. Runtime and adapter compile
under the same strict configuration directly to dist.

Source directories contain no generated JS or declarations. Tests and examples
run TypeScript directly without a prior build. Imported any / nullable types
and object-pool initialization contracts remain intact; animation algorithms
were retained. upstream.json records the original commit and file hashes for
provenance, rather than checking adapted source against those hashes.

The shared 5.7.000 runtime version does not imply byte-identical source with the
old game's runtime. See [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md) for MIT notices.
