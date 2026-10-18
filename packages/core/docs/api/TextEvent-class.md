# TextEvent

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class TextEvent extends Event
```

Mutable event with capture/target/bubble context and cancellation flags.
Events created through the pool may be reused after dispatch/release; copy
needed values rather than retaining a pooled event object.

Related types: [Event](Event-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](TextEvent-class/constructor-constructor.md) |
| `data` | public, inherited | [open](TextEvent-class/data-property.md) |
| `text` | public | [open](TextEvent-class/text-property.md) |
| `static ACTIVATE` | public, inherited | [open](TextEvent-class/static-ACTIVATE-property.md) |
| `static ADDED` | public, inherited | [open](TextEvent-class/static-ADDED-property.md) |
| `static ADDED_TO_STAGE` | public, inherited | [open](TextEvent-class/static-ADDED_TO_STAGE-property.md) |
| `static CHANGE` | public, inherited | [open](TextEvent-class/static-CHANGE-property.md) |
| `static CHANGING` | public, inherited | [open](TextEvent-class/static-CHANGING-property.md) |
| `static CLOSE` | public, inherited | [open](TextEvent-class/static-CLOSE-property.md) |
| `static COMPLETE` | public, inherited | [open](TextEvent-class/static-COMPLETE-property.md) |
| `static CONNECT` | public, inherited | [open](TextEvent-class/static-CONNECT-property.md) |
| `static DEACTIVATE` | public, inherited | [open](TextEvent-class/static-DEACTIVATE-property.md) |
| `static ENDED` | public, inherited | [open](TextEvent-class/static-ENDED-property.md) |
| `static ENTER_FRAME` | public, inherited | [open](TextEvent-class/static-ENTER_FRAME-property.md) |
| `static FOCUS_IN` | public, inherited | [open](TextEvent-class/static-FOCUS_IN-property.md) |
| `static FOCUS_OUT` | public, inherited | [open](TextEvent-class/static-FOCUS_OUT-property.md) |
| `static LEAVE_STAGE` | public, inherited | [open](TextEvent-class/static-LEAVE_STAGE-property.md) |
| `static LINK` | public | [open](TextEvent-class/static-LINK-property.md) |
| `static LOOP_COMPLETE` | public, inherited | [open](TextEvent-class/static-LOOP_COMPLETE-property.md) |
| `static REMOVED` | public, inherited | [open](TextEvent-class/static-REMOVED-property.md) |
| `static REMOVED_FROM_STAGE` | public, inherited | [open](TextEvent-class/static-REMOVED_FROM_STAGE-property.md) |
| `static RENDER` | public, inherited | [open](TextEvent-class/static-RENDER-property.md) |
| `static RESIZE` | public, inherited | [open](TextEvent-class/static-RESIZE-property.md) |
| `static SOUND_COMPLETE` | public, inherited | [open](TextEvent-class/static-SOUND_COMPLETE-property.md) |
| `bubbles` | public, inherited | [open](TextEvent-class/bubbles-accessor.md) |
| `cancelable` | public, inherited | [open](TextEvent-class/cancelable-accessor.md) |
| `currentTarget` | public, inherited | [open](TextEvent-class/currentTarget-accessor.md) |
| `eventPhase` | public, inherited | [open](TextEvent-class/eventPhase-accessor.md) |
| `isPropagationImmediateStopped` | public, inherited | [open](TextEvent-class/isPropagationImmediateStopped-accessor.md) |
| `isPropagationStopped` | public, inherited | [open](TextEvent-class/isPropagationStopped-accessor.md) |
| `target` | public, inherited | [open](TextEvent-class/target-accessor.md) |
| `type` | public, inherited | [open](TextEvent-class/type-accessor.md) |
| `clean` | protected, inherited | [open](TextEvent-class/clean-method.md) |
| `isDefaultPrevented` | public, inherited | [open](TextEvent-class/isDefaultPrevented-method.md) |
| `preventDefault` | public, inherited | [open](TextEvent-class/preventDefault-method.md) |
| `resetForPool` | public, inherited | [open](TextEvent-class/resetForPool-method.md) |
| `setCurrentTarget` | public, inherited | [open](TextEvent-class/setCurrentTarget-method.md) |
| `setDispatchContext` | public, inherited | [open](TextEvent-class/setDispatchContext-method.md) |
| `stopImmediatePropagation` | public, inherited | [open](TextEvent-class/stopImmediatePropagation-method.md) |
| `stopPropagation` | public, inherited | [open](TextEvent-class/stopPropagation-method.md) |
| `static create` | public, inherited | [open](TextEvent-class/static-create-method.md) |
| `static dispatch` | public, inherited | [open](TextEvent-class/static-dispatch-method.md) |
| `static dispatchTextEvent` | public | [open](TextEvent-class/static-dispatchTextEvent-method.md) |
| `static release` | public, inherited | [open](TextEvent-class/static-release-method.md) |
