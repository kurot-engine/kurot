# Make a game with Kurot

Use the public SDK and the consumer project's own README, declarations and
bundled topic guides. This workflow needs no engine source in the game project.

## 1. Establish the project and its baseline

Read the project's README, package.json, lock and `pnpm list --depth 0`.
The lock records the resolved baseline; a compatible range or newer source
manifest does not change an existing installation. Use a frozen install for
reproduction and preserve the chosen SDK versions while developing gameplay.

| Needed capability | Package |
| --- | --- |
| Display, logical stage, touch, text, resources, sound | `@kurot/core` |
| Tween, MovieClip, particles | Add `@kurot/game` when needed |
| HUD controls/layout/skins | Add `@kurot/ui`; plain Shape/TextField HUDs need only Core |
| Create/build/dev server, compiled KUI | `@kurot/cli` as a development dependency |
| Semantic document materialization | `@kurot/ui-runtime` and its peers, only for that feature |

CLI-compiled skins run through UI without ui-runtime. ui-document is headless;
the game starter uses it for project styles, not as a rendering engine.

For authored game UI, use the repository's
[standard UI workflow](../../ui/docs/ui-authoring.md), including its directory
map and paired ScoreHUD example. Those new guides postdate UI 3.6.1; use the
repository copy until a later package includes them. The installed UI API
reference remains the source for exact methods and properties.

For a complete reference in an engine checkout, read
[Star Catcher](../../../examples/star-catcher/README.md) and run its `pnpm check`.
It demonstrates input → score → three misses → end → restart → cleanup with
no asset download or server. The reference project is repository content, not
part of the Core npm artifact. In a consumer project, use its local entry and
installed README/types instead of assuming repository paths exist.

## 2. Start one Player and use logical coordinates

```ts
import { createPlayer, Sprite } from '@kurot/core';

const canvas = document.getElementById('gameCanvas');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing canvas');
const app = createPlayer({ canvas, contentWidth: 640, contentHeight: 800 });
const root = new Sprite();
app.start(root);
```

`createPlayer` initializes capabilities, rendering, input and screen adaptation.
CLI pages can use `createPlayer({ canvas })` with the defaults described in
[stage configuration](stage-configuration.md). This requires Core >= 2.6.0
within 2.x; keep explicit options with older installations.
When customizing CLI-authored HTML, retain its import-map, stage and entry-script
placeholders; the CLI validates all of them before generating the page.
One Player owns the page's runtime hooks. Keep its canvas parent sized: the
ScreenAdapter measures that parent. Native browser input starts in CSS pixels;
Kurot TouchEvent.stageX/Y already use stage logical units. Convert with the
relevant container's `globalToLocal` when working in another local frame.
Backing-store resolution and texture source density are separate from logical
game coordinates; see [texture density](texture-density.md) only when needed.

Done: the page renders a visible object without console errors; pointer positions
still match after resizing. Build output is served over HTTP.

## 3. Own a game clock and explicit round state

Use application state such as ready → playing ↔ paused → ended. Restart may
create a fresh session on the same Player; Kurot does not supply a Phaser-style
SceneManager. Display-list removal is independent from callback lifetime.

```ts
import { ticker } from '@kurot/core';

let lastTime: number | undefined;
const onTick = (timeStamp: number): boolean => {
	const seconds = lastTime === undefined ? 0 : Math.min((timeStamp - lastTime) / 1000, 0.05);
	lastTime = timeStamp;
	// Advance application rules by seconds; render the resulting state.
	return false;
};
ticker.startTick(onTick, undefined);
// Pause/end: unregister the same callback and receiver, then reset the clock.
ticker.stopTick(onTick, undefined);
lastTime = undefined;
```

The Player starts the shared ticker. startTick callbacks receive timestamps in
milliseconds, not delta seconds. ENTER_FRAME follows frame scheduling; choose
one gameplay update path. The first callback after start/resume establishes the
clock. The reference caps long frames instead of simulating all lost wall time;
fixed-step simulations need their own bounded accumulator.

Backgrounding pauses the shared ticker through createPlayer's lifecycle hook.
Handle Stage DEACTIVATE to clear input and pause the round; resume explicitly
with a fresh timestamp. `app.stop()` only unregisters the Player's rendering,
so it cannot substitute for pausing game rules, Tween, Timer or sound.

Done: speed is expressed in logical pixels/second; pause does not advance score
or lives, and resume has neither a time jump nor a stuck key.

## 4. Map input and implement the smallest useful collision

Keyboard input uses DOM keydown/keyup; touch uses Kurot TouchEvent BEGIN/MOVE/
END, RELEASE_OUTSIDE and CANCEL. Feed both into application actions such as a
horizontal axis or moveTo(x). Clear held keys and pointer ownership on blur,
cancel, pause and exit. Retain callback identities for later removal.

EventDispatcher listener arguments are `(type, listener, useCapture?, priority?)`;
there is no Egret thisObject parameter. Use stable arrow callbacks or bind once.
Resource has a separate on/off interface; it is not an EventDispatcher.

For simple gameplay, use explicit same-coordinate-system AABBs or
Rectangle.intersects. Rendering hit tests serve pointer targeting; do not
invent a hitTestObject method. The reference uses a swept falling-star crossing
plus horizontal bounds so an update cannot skip the basket.

Done: keyboard and touch produce the same action, movement is bounded, and one
catch scores once. Misses reduce lives until the ended state freezes gameplay.

## 5. Add assets, animation or UI only when needed

Load a manifest such as `resource/default.res.json` with prefix `resource/`;
a URL `assets/star.png` then becomes `resource/assets/star.png`. Await the
required group before starting the scene. Track one-off progress with
loadGroup's callback; permanent resource.onProgress listeners need explicit
removal. See [resources](resource.md) for errors, sheet subkeys and ownership.

For animation use the installed Game README: Tween durations are milliseconds,
and MovieClip advances through an application-owned external scheduler. Remove
owned tweens/clips when their scene ends. For audio, resource sound yields an
HTMLAudioElement while `new Sound()` has Sound/SoundChannel contracts; choose
the intended path and retain stop/cleanup handles. See [audio](audio-playback.md).

For a HUD, ordinary Shape/TextField needs no UI setup. With UI/KUI, follow the
project's font → Player → resources/theme → scene ordering and wait for skin
parts before attaching handlers. Compile authored XML rather than editing
generated theme modules or `.kurot/` declarations. Text defaults to middle;
set top explicitly for content that begins at the top of a box.

## 6. Restart and dispose by ownership

| Owner | Release when the round/app ends |
| --- | --- |
| Session | stopTick, stage/DOM input listeners, timers, owned tweens/particles and sound channels |
| Display root | remove the session subtree after stopping its activity |
| Async work | cancel where supported, or ignore results for a disposed session |
| Resources | release only assets the session owns; shared assets outlive one round |
| Page/app | abort controls, dispose the session, app.destroy; stop the ticker only when this app owns all consumers |

Use idempotent disposal and remove the same listener/callback identities that
were registered. Dispose the old round before starting another. Removing a
child or destroying the Player alone does not cancel application-owned work.

Done: repeated restarts preserve one set of inputs/update callbacks; Close and
pagehide stop activity and no later callback changes the disposed UI.

## 7. Verify behavior, not just transpilation

Use the project's real scripts. For the reference, `pnpm check` performs strict
type checking, rule tests, development/release builds and browser acceptance of
both outputs. CLI/esbuild build success alone is not TypeScript or gameplay
verification. KUI projects generate part declarations before type checking.

Exercise input, score, end, restart, cleanup, narrow layout and console/resource
errors. Keep deterministic fixtures or a controlled clock for repeatable tests,
and retain screenshots/traces on failure. Report which checks ran and which
behavior still needs manual verification. Read engine internals only when the
installed types and relevant public guide do not explain a failure.
