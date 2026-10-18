# Theme

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
class Theme extends EventDispatcher
```

Maps component class names to default skins.
Construction registers this as the active theme and starts loading the
JSON configuration. COMPLETE follows loading its optional skinsJs module;
failures dispatch IO_ERROR instead. Wait for component skin readiness before
using its typed parts.

**example**

```ts
import { Event, IOErrorEvent } from '@kurot/core';
import { Theme } from '@kurot/ui';

const theme = new Theme('resource/default.thm.json');
theme.once(Event.COMPLETE, () => console.log('Theme and skin module ready'));
theme.once(IOErrorEvent.IO_ERROR, () => console.error('Theme failed'));
```

Related types: [EventDispatcher](../../../core/docs/api/EventDispatcher-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Theme-class/constructor-constructor.md) |
| `addEventListener` | public, inherited | [open](Theme-class/addEventListener-method.md) |
| `dispatchEvent` | public, inherited | [open](Theme-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](Theme-class/dispatchEventWith-method.md) |
| `getSkinName` | public | [open](Theme-class/getSkinName-method.md) |
| `getStyleConfig` | public | [open](Theme-class/getStyleConfig-method.md) |
| `hasEventListener` | public, inherited | [open](Theme-class/hasEventListener-method.md) |
| `mapSkin` | public | [open](Theme-class/mapSkin-method.md) |
| `notifyListener` | protected, inherited | [open](Theme-class/notifyListener-method.md) |
| `once` | public, inherited | [open](Theme-class/once-method.md) |
| `removeEventListener` | public, inherited | [open](Theme-class/removeEventListener-method.md) |
| `willTrigger` | public, inherited | [open](Theme-class/willTrigger-method.md) |
