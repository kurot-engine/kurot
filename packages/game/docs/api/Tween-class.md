# Tween

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
class Tween
```

Property animation sequence with repeat, yoyo, and thenable completion.

**example**

```ts
import { Tween, Ease } from '@kurot/game';

const sprite = { x: 0, alpha: 1 };
await Tween.get(sprite)
	.to({ x: 200, alpha: 0 }, 300, Ease.cubicOut)
	.wait(100);
```

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Tween-class/constructor-constructor.md) |
| `isActive` | public | [open](Tween-class/isActive-accessor.md) |
| `call` | public | [open](Tween-class/call-method.md) |
| `from` | public | [open](Tween-class/from-method.md) |
| `pause` | public | [open](Tween-class/pause-method.md) |
| `remove` | public | [open](Tween-class/remove-method.md) |
| `resume` | public | [open](Tween-class/resume-method.md) |
| `set` | public | [open](Tween-class/set-method.md) |
| `setPaused` | public | [open](Tween-class/setPaused-method.md) |
| `setPosition` | public | [open](Tween-class/setPosition-method.md) |
| `then` | public | [open](Tween-class/then-method.md) |
| `to` | public | [open](Tween-class/to-method.md) |
| `wait` | public | [open](Tween-class/wait-method.md) |
| `static get` | public | [open](Tween-class/static-get-method.md) |
| `static getCount` | public | [open](Tween-class/static-getCount-method.md) |
| `static pauseAll` | public | [open](Tween-class/static-pauseAll-method.md) |
| `static pauseTweens` | public | [open](Tween-class/static-pauseTweens-method.md) |
| `static removeAllTweens` | public | [open](Tween-class/static-removeAllTweens-method.md) |
| `static removeTweens` | public | [open](Tween-class/static-removeTweens-method.md) |
| `static resumeAll` | public | [open](Tween-class/static-resumeAll-method.md) |
| `static resumeTweens` | public | [open](Tween-class/static-resumeTweens-method.md) |
