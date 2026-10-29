# FocusEvent

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class FocusEvent extends Event
```

Mutable event with capture/target/bubble context and cancellation flags.
Events created through the pool may be reused after dispatch/release; copy
needed values rather than retaining a pooled event object.

Related types: [Event](Event-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](FocusEvent-class/constructor-constructor.md) |
| `data` | public, inherited | [open](FocusEvent-class/data-property.md) |
| `static ACTIVATE` | public, inherited | [open](FocusEvent-class/static-ACTIVATE-property.md) |
| `static ADDED` | public, inherited | [open](FocusEvent-class/static-ADDED-property.md) |
| `static ADDED_TO_STAGE` | public, inherited | [open](FocusEvent-class/static-ADDED_TO_STAGE-property.md) |
| `static CHANGE` | public, inherited | [open](FocusEvent-class/static-CHANGE-property.md) |
| `static CHANGING` | public, inherited | [open](FocusEvent-class/static-CHANGING-property.md) |
| `static CLOSE` | public, inherited | [open](FocusEvent-class/static-CLOSE-property.md) |
| `static COMPLETE` | public, inherited | [open](FocusEvent-class/static-COMPLETE-property.md) |
| `static CONNECT` | public, inherited | [open](FocusEvent-class/static-CONNECT-property.md) |
| `static DEACTIVATE` | public, inherited | [open](FocusEvent-class/static-DEACTIVATE-property.md) |
| `static ENDED` | public, inherited | [open](FocusEvent-class/static-ENDED-property.md) |
| `static ENTER_FRAME` | public, inherited | [open](FocusEvent-class/static-ENTER_FRAME-property.md) |
| `static FOCUS_IN` | public | [open](FocusEvent-class/static-FOCUS_IN-property.md) |
| `static FOCUS_OUT` | public | [open](FocusEvent-class/static-FOCUS_OUT-property.md) |
| `static LEAVE_STAGE` | public, inherited | [open](FocusEvent-class/static-LEAVE_STAGE-property.md) |
| `static LOOP_COMPLETE` | public, inherited | [open](FocusEvent-class/static-LOOP_COMPLETE-property.md) |
| `static REMOVED` | public, inherited | [open](FocusEvent-class/static-REMOVED-property.md) |
| `static REMOVED_FROM_STAGE` | public, inherited | [open](FocusEvent-class/static-REMOVED_FROM_STAGE-property.md) |
| `static RENDER` | public, inherited | [open](FocusEvent-class/static-RENDER-property.md) |
| `static RESIZE` | public, inherited | [open](FocusEvent-class/static-RESIZE-property.md) |
| `static SOUND_COMPLETE` | public, inherited | [open](FocusEvent-class/static-SOUND_COMPLETE-property.md) |
| `bubbles` | public, inherited | [open](FocusEvent-class/bubbles-accessor.md) |
| `cancelable` | public, inherited | [open](FocusEvent-class/cancelable-accessor.md) |
| `currentTarget` | public, inherited | [open](FocusEvent-class/currentTarget-accessor.md) |
| `eventPhase` | public, inherited | [open](FocusEvent-class/eventPhase-accessor.md) |
| `isPropagationImmediateStopped` | public, inherited | [open](FocusEvent-class/isPropagationImmediateStopped-accessor.md) |
| `isPropagationStopped` | public, inherited | [open](FocusEvent-class/isPropagationStopped-accessor.md) |
| `target` | public, inherited | [open](FocusEvent-class/target-accessor.md) |
| `type` | public, inherited | [open](FocusEvent-class/type-accessor.md) |
| `clean` | protected, inherited | [open](FocusEvent-class/clean-method.md) |
| `isDefaultPrevented` | public, inherited | [open](FocusEvent-class/isDefaultPrevented-method.md) |
| `preventDefault` | public, inherited | [open](FocusEvent-class/preventDefault-method.md) |
| `resetForPool` | public, inherited | [open](FocusEvent-class/resetForPool-method.md) |
| `setCurrentTarget` | public, inherited | [open](FocusEvent-class/setCurrentTarget-method.md) |
| `setDispatchContext` | public, inherited | [open](FocusEvent-class/setDispatchContext-method.md) |
| `stopImmediatePropagation` | public, inherited | [open](FocusEvent-class/stopImmediatePropagation-method.md) |
| `stopPropagation` | public, inherited | [open](FocusEvent-class/stopPropagation-method.md) |
| `static create` | public, inherited | [open](FocusEvent-class/static-create-method.md) |
| `static dispatch` | public, inherited | [open](FocusEvent-class/static-dispatch-method.md) |
| `static release` | public, inherited | [open](FocusEvent-class/static-release-method.md) |
