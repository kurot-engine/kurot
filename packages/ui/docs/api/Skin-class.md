# Skin

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
class Skin extends EventDispatcher<SkinEvents>
```

Base class for all UI skins.

Skins are typically generated from KUI XML by `@kurot/cli`.
A skin holds the visual $children of a Component and exposes named
"skin parts" (e.g. `labelDisplay`, `iconDisplay`) that the host
component receives as one complete, read-only part set.

The skin also owns the view-state list (`states`) and applies state
changes to its $children when `currentState` changes.
Skin itself is not a DisplayObject; the host parents elementsContent.

**example**

```ts
import { Button, Label, Rect, Skin } from '@kurot/ui';

class AnswerSkin extends Skin {
  public constructor() {
    super();
    const background = new Rect();
    background.width = 160;
    background.height = 48;
    background.fillColor = 0x345678;
    const caption = new Label();
    caption.width = 160;
    caption.height = 48;
    this.skinParts = ['labelDisplay'];
    this.setPart('labelDisplay', caption);
    this.elementsContent = [background, caption];
  }
}
const answer = new Button();
answer.skinName = AnswerSkin;
answer.label = 'Answer';
```

Related types: [EventDispatcher](../../../core/docs/api/EventDispatcher-class.md), [SkinEvents](SkinEvents-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public, inherited | [open](Skin-class/constructor-constructor.md) |
| `height` | public | [open](Skin-class/height-property.md) |
| `maxHeight` | public | [open](Skin-class/maxHeight-property.md) |
| `maxWidth` | public | [open](Skin-class/maxWidth-property.md) |
| `minHeight` | public | [open](Skin-class/minHeight-property.md) |
| `minWidth` | public | [open](Skin-class/minWidth-property.md) |
| `skinParts` | public | [open](Skin-class/skinParts-property.md) |
| `states` | public | [open](Skin-class/states-property.md) |
| `width` | public | [open](Skin-class/width-property.md) |
| `currentState` | public | [open](Skin-class/currentState-accessor.md) |
| `elementsContent` | public | [open](Skin-class/elementsContent-accessor.md) |
| `hostComponent` | public | [open](Skin-class/hostComponent-accessor.md) |
| `addEventListener` | public, inherited | [open](Skin-class/addEventListener-method.md) |
| `dispatchEvent` | public, inherited | [open](Skin-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](Skin-class/dispatchEventWith-method.md) |
| `getPart` | public | [open](Skin-class/getPart-method.md) |
| `hasEventListener` | public, inherited | [open](Skin-class/hasEventListener-method.md) |
| `hasState` | public | [open](Skin-class/hasState-method.md) |
| `notifyListener` | protected, inherited | [open](Skin-class/notifyListener-method.md) |
| `once` | public, inherited | [open](Skin-class/once-method.md) |
| `removeEventListener` | public, inherited | [open](Skin-class/removeEventListener-method.md) |
| `setPart` | public | [open](Skin-class/setPart-method.md) |
| `unwatchAll` | public | [open](Skin-class/unwatchAll-method.md) |
| `willTrigger` | public, inherited | [open](Skin-class/willTrigger-method.md) |
