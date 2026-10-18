# ScoreHUD: one complete component pair

This recipe ships with UI 3.6.2 and accompanies
[standard UI authoring](../ui-authoring.md). Use the game template's fonts, native
skins, stylesheet, AssetAdapter and resource/theme startup. The example makes
no runtime dependency or engine implementation changes.

## Authored Skin

Save as `resource/ui/components/hud/ScoreHUDSkin.kui.xml`:

```xml
<Skin xmlns="https://kurot.dev/ui/1"
      class="components.hud.ScoreHUDSkin" minWidth="280" minHeight="80">
  <Rect left="0" right="0" top="0" bottom="0"
        fillColor="@style:colors:surface" />
  <Label id="scoreLabel" left="16" right="140" top="16" bottom="16"
         text="Score: 0" size="24" multiline="false"
         textFit="shrink" minFontSize="14" verticalAlign="middle"
         textColor="@style:colors:text" />
  <Button id="restartButton" right="16" verticalCenter="0"
          width="108" height="48" label="Restart" />
</Skin>
```

The project palette supplies surface/text. Button uses the template's normal
theme mapping and loaded atlas. Text is literal here for a self-contained
example; route Score/Restart through the project's locale service in a game.

## Component behavior

Save as `src/components/hud/ScoreHUD.ts`:

```ts
import { TouchEvent } from '@kurot/core';
import { Component } from '@kurot/ui';

export class ScoreHUD extends Component<'components.hud.ScoreHUDSkin'> {
  private _score = 0;
  private readonly _onRestart = (): void => {
    this.dispatchEventWith('restartRequested');
  };

  public get score(): number {
    return this._score;
  }

  public set score(value: number) {
    this._score = value;
    if (this.skinReady) {
      this.skinParts.scoreLabel.text = `Score: ${value}`;
    }
  }

  protected override onSkinReady(): void {
    super.onSkinReady();
    this.skinParts.scoreLabel.text = `Score: ${this._score}`;
    this.skinParts.restartButton.addEventListener(
      TouchEvent.TOUCH_TAP, this._onRestart,
    );
  }

  protected override onSkinRemoved(): void {
    this.skinParts.restartButton.removeEventListener(
      TouchEvent.TOUCH_TAP, this._onRestart,
    );
    super.onSkinRemoved();
  }
}
```

The generated theme pairs ScoreHUD with its Skin. No constructor skinParts
access, dynamic field injection or hand-authored declaration is needed. Setting
score before attachment is safe because onSkinReady renders the saved value.

## Scene-owned attachment and cleanup

Save as `src/scenes/mountScoreHUD.ts`. Helpers live outside scanned components:

```ts
import { Event } from '@kurot/core';
import type { Group } from '@kurot/ui';
import { ScoreHUD } from '../components/hud/ScoreHUD.js';

export interface ScoreHUDHandle {
  setScore(value: number): void;
  dispose(): void;
}

export function mountScoreHUD(
  parent: Group, onRestart: () => void,
): ScoreHUDHandle {
  const hud = new ScoreHUD();
  hud.left = 0;
  hud.right = 0;
  hud.top = 0;
  hud.height = 80;
  const onRequest = (_event: Event): void => { onRestart(); };
  hud.addEventListener('restartRequested', onRequest);
  parent.addChild(hud);
  let disposed = false;

  return {
    setScore(value: number): void {
      if (!disposed) {
        hud.score = value;
      }
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      hud.removeEventListener('restartRequested', onRequest);
      if (hud.parent) {
        hud.parent.removeChild(hud);
      }
    },
  };
}
```

Call only after the project's theme/resources are ready, using a Group/UILayer
whose layout is active. The scene calls setScore after rule changes, handles
onRestart through its session logic, and calls dispose before replacing the
round or closing. Any separate model subscription is also owned by that scene.
This is a project factory, not an engine SceneManager or built-in disposal API.
Removing the HUD retains its internal skin; the component's skin-part listener
is removed when that skin is replaced, while the scene listener is removed above.

## Reuse inside another authored Skin

Outside the paired component directory, save a standalone appearance such as
`resource/ui/app/HostSkin.kui.xml`:

```xml
<Skin xmlns="https://kurot.dev/ui/1"
      xmlns:game="https://kurot.dev/components/game"
      class="app.HostSkin" width="640" height="360">
  <game:ScoreHUD id="scoreHUD" left="0" right="0" top="0" height="80" />
</Skin>
```

The folder `hud/` organizes files; the tag stays `game:ScoreHUD`. The host can
extend `Component<'app.HostSkin'>` and receive a typed scoreHUD part, or the
controller can mount the component directly as shown above. These are
alternative ownership paths; do not mount a second HUD merely to update the
one already authored inside a host Skin.

## Checks

With `ui.components` as shown in the guide and the template's TypeScript
include for `.kurot/**/*.d.ts`, run build → tsc --noEmit --skipLibCheck false →
release. Confirm that
generated theme JSON maps ScoreHUD to components.hud.ScoreHUDSkin and that the
part declarations type scoreLabel as Label and restartButton as Button.

The documentation check compiles these exact TS/XML fences using locally packed
CLI 3.6.1/UI 3.6.2 and published Core 2.5.5, without engine source. Development
and release builds pass strict checking with skipLibCheck=false, including the
custom namespace tag, generated mappings and part types. CLI 3.6.1 is published
and verified; UI 3.6.2 publication is user-reported but not yet verified on npm.
The recipe checks used the prepared local UI archive. This is compile validation;
verify startup, visual bounds and repeated open/restart/close in the host browser.

Published CLI 3.6.0 emits a readonly property over Component's accessor and can
report TS2610 with skipLibCheck=false. CLI 3.6.1 emits a getter signature instead.
Regenerate declarations with the fixed CLI; no Core/UI implementation change or
unsafe cast is needed.
