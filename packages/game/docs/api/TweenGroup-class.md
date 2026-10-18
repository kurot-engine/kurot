# TweenGroup

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
class TweenGroup
```

Manages a named collection of active Tweens.

**example**

```ts
import { TweenGroup } from '@kurot/game';

const button = { alpha: 1 };
const group = new TweenGroup('ui');
group.get(button).to({ alpha: 0 }, 200);
group.pause();
group.resume();
group.removeAll();
```

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](TweenGroup-class/constructor-constructor.md) |
| `name` | public | [open](TweenGroup-class/name-property.md) |
| `size` | public | [open](TweenGroup-class/size-accessor.md) |
| `add` | public | [open](TweenGroup-class/add-method.md) |
| `get` | public | [open](TweenGroup-class/get-method.md) |
| `pause` | public | [open](TweenGroup-class/pause-method.md) |
| `removeAll` | public | [open](TweenGroup-class/removeAll-method.md) |
| `resume` | public | [open](TweenGroup-class/resume-method.md) |
