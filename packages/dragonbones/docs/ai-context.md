# @kurot/dragonbones — AI context

Version 0.1.0 is published to npm.
The only peer is `@kurot/core ^2.1.1`; development declares `^2.2.0` and the
lockfile resolves published Core 2.2.0 without local overrides. Updating that
development lock does not raise the peer minimum or require a new adapter release
when shipped output is unchanged. The adapter does not require Core's TextField wrapping
changes or the new UI BitmapLabel.
ES2022, ESM and strict TypeScript. Maintained in `packages/dragonbones` within
the Kurot repository; directory paths below are relative to this package.

## Directory map

| Directory / file                                             | Responsibility                                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                                               | All named exports                                                                                                                     |
| `src/kurot/KurotFactory.ts`                                  | Resource parsing, root-armature ownership, clock and disposal                                                                         |
| `src/kurot/KurotArmatureDisplay.ts`                          | Sprite / IArmatureProxy implementation and event bridge                                                                               |
| `src/kurot/KurotSlot.ts`                                     | Images and meshes, transforms, colors, blending and atlas replacement                                                                 |
| `src/kurot/mesh-geometry.ts`                                 | Binary arrays to Mesh, weights, deform and Surface coordinates                                                                        |
| `src/kurot/KurotTextureAtlasData.ts` / `KurotTextureData.ts` | Region views over borrowed page textures                                                                                              |
| `src/kurot/DragonBonesEvent.ts`                              | Core Event integration and scalar snapshots                                                                                           |
| `src/runtime`                                                | Official TypeScript runtime adapted to ESM; retains core / geom / model / armature / animation / event / parser / factory directories |
| `src/runtime/index.ts` / `dragonbones.ts`                    | Named-export barrels and the public dragonBones module namespace entry                                                                |
| `upstream.json` / `src/runtime/LICENSE`                      | Original commit and source hashes, adaptation notes and upstream license                                                              |
| `tools/build.ts`                                             | Compiles runtime and adapter with the same strict configuration and copies the license                                                |
| `dist`                                                       | Generated JS / declarations; neither committed nor edited manually                                                                    |
| `test`                                                       | Vitest tests and small synthetic JSON assets                                                                                          |
| `examples` / `tools/serve-example.ts`                        | Browser backend comparisons using resources from external directories                                                                 |
| `tools/verify-project.ts`                                    | Frame-by-frame numeric checks over all DBDT assets, without image rendering                                                           |

## Public API

- `KurotFactory`: constructor options `{ autoUpdate?: boolean }`; `autoUpdate`,
  `displayCount`, `disposed`, `soundEventManager`; `parseSkeleton(unknown, name?, scale?)`,
  `parseAtlas(unknown, Texture, name?, scale?)`,
  `buildArmatureDisplay(name, skeletonName?, skinName?, atlasName?)`;
  `advanceTime(seconds)`, `dispose()`, `clear(disposeData?)`, and upstream BaseFactory APIs.
- `KurotArmatureDisplay extends Sprite`: `armature`, `animation`, `disposed`;
  `dispose()`, `addDBEventListener` / `removeDBEventListener` / `hasDBEventListener`.
  Implements upstream `dbInit`, `dbClear`, `dbUpdate` and `dispatchDBEvent`.
  `setReleaseHandler` is an internal factory-ownership interface.
- `DragonBonesEvent extends Event`: `name`, `time`, `animationName` and synchronous
  access to `eventObject`; the `DragonBonesListener` type.
- `KurotSlot`, `KurotTextureAtlasData`, `KurotTextureData`: upstream extension points.
  Atlas and region `renderTexture` properties use Core Texture.
- `dragonBones` namespace: the official general-purpose runtime, also exported
  through `@kurot/dragonbones/runtime`.

## Non-obvious contracts

Images also use Mesh with two triangles to keep rendering backends and rotated
UV semantics consistent. Rotated regions create Texture views with unrotated
width/height; Core's Mesh renderer interprets `rotated=true`. Upstream Slot pivot
handling accounts for trimmed-frame origins. Do not also write these origins to
Core texture offsets, which would apply them twice.
Weighted meshes and Surface output armature-global coordinates, so their display
object matrices must be identity. Ordinary meshes output local coordinates and
retain the bone transform on the display object. Core's matrix getter returns a
clone: assign the modified matrix back. Call `updateVertices()` after mesh array changes.

`KurotSlot.invalidUpdate()` additionally marks the texture dirty. Upstream
`Armature.replacedTexture` calls invalidUpdate, but an unchanged attachment does
not automatically mark its native texture dirty.
The factory owns only root armatures created by `buildArmatureDisplay`. Direct
use of inherited `buildArmature` is an advanced API: callers must manage clock
registration/removal and disposal themselves. Parent Slots own nested armatures;
these do not add to displayCount or register another ticker callback.
The default ticker registers a callback without starting Core's ticker. Its first
callback uses elapsed=0, and switching drivers resets the time baseline.
A zero WorldClock delta does not update the pose, but the outer DragonBones
runtime still drains its recycling queue. Releasing the last display also drains
that queue; disposal inside an event drains it after advanceTime returns.
All atlas pages are borrowed. Region views use `disposeBitmapData=false` and
must not dispose caller-owned textures. Normal / Add / Erase blending is
supported; see README for Canvas limitations on GPU color filters.

The runtime is maintained directly as TypeScript source, with namespaces
converted to ESM imports/exports and no global injection. Preserve original
animation, geometry and parsing algorithms, including existing upstream any/null
contracts. Do not mechanically split or bulk-format large imported files.
Pool fields use `!` to express initialization by `_onClear` / init. Inherited
members declare override without changing runtime behavior.
Own code remains strict and uses undefined. Third-party boundaries use unknown
or upstream types, without declaring or generating null in adapter code.
The original commit and file hashes record provenance; do not compare adapted
source against the old hashes. `preserveConstEnums` retains runtime enum values
for ESM consumers and esbuild tooling. All 96 original runtime exports remain available.

## Commands

Run in the package directory: `pnpm build` compiles all TS directly into dist;
`pnpm typecheck` includes runtime, tools, tests and examples; also run `pnpm test`
and `pnpm format`. Tests and examples import TS directly, without generated
intermediate files. The format command does not bulk-rewrite imported runtime files.
`pnpm example [original project UI resource directory]` starts a loopback server on 4179.
`pnpm verify:project <resource directory>` visits every `_ske.dbbin` with matching
`_tex.json/png` files.
Adapter-boundary changes require corresponding numeric and lifecycle tests.
UV/transform changes require browser checks on both rendering backends.
See `docs/verification.md` for the full verification scope. Game migration remains paused.
