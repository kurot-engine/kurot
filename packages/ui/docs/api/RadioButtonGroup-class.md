# RadioButtonGroup

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
class RadioButtonGroup extends EventDispatcher
```

Manages a group of mutually exclusive RadioButtons.
Only one radio button in a group can be selected at a time.

Dispatches `Event.CHANGE` on interactive selection (via `buttonReleased`),
and `PropertyEvent` for `selectedValue` on every selection change.

Related types: [EventDispatcher](../../../core/docs/api/EventDispatcher-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](RadioButtonGroup-class/constructor-constructor.md) |
| `enabled` | public | [open](RadioButtonGroup-class/enabled-accessor.md) |
| `name` | public | [open](RadioButtonGroup-class/name-accessor.md) |
| `numRadioButtons` | public | [open](RadioButtonGroup-class/numRadioButtons-accessor.md) |
| `selectedValue` | public | [open](RadioButtonGroup-class/selectedValue-accessor.md) |
| `selection` | public | [open](RadioButtonGroup-class/selection-accessor.md) |
| `addEventListener` | public, inherited | [open](RadioButtonGroup-class/addEventListener-method.md) |
| `addInstance` | public | [open](RadioButtonGroup-class/addInstance-method.md) |
| `dispatchEvent` | public, inherited | [open](RadioButtonGroup-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](RadioButtonGroup-class/dispatchEventWith-method.md) |
| `hasEventListener` | public, inherited | [open](RadioButtonGroup-class/hasEventListener-method.md) |
| `notifyListener` | protected, inherited | [open](RadioButtonGroup-class/notifyListener-method.md) |
| `once` | public, inherited | [open](RadioButtonGroup-class/once-method.md) |
| `removeEventListener` | public, inherited | [open](RadioButtonGroup-class/removeEventListener-method.md) |
| `removeInstance` | public | [open](RadioButtonGroup-class/removeInstance-method.md) |
| `willTrigger` | public, inherited | [open](RadioButtonGroup-class/willTrigger-method.md) |
