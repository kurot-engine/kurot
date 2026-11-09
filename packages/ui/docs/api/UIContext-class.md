# UIContext

Package: `@kurot/ui@5.1.5`. Generated from public declarations and JSDoc.

```ts
class UIContext
```

Isolates default skins, explicit skin names, images and default UI fonts.
Construct a subtree inside run(), or bind its root before stage attachment.
A local miss never falls back to the global Theme/skin/asset registries.

run() only scopes synchronous construction; it restores the previous context
before a returned Promise settles. Captured nodes retain their own context.
dispose() revokes late UI work; it does not release borrowed resources.

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](UIContext-class/constructor-constructor.md) |
| `options` | public | [open](UIContext-class/options-property.md) |
| `disposed` | public | [open](UIContext-class/disposed-accessor.md) |
| `bind` | public | [open](UIContext-class/bind-method.md) |
| `dispose` | public | [open](UIContext-class/dispose-method.md) |
| `getSkinName` | public | [open](UIContext-class/getSkinName-method.md) |
| `resolveSkin` | public | [open](UIContext-class/resolveSkin-method.md) |
| `run` | public | [open](UIContext-class/run-method.md) |
