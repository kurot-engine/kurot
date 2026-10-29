# TimerEvent

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class TimerEvent extends Event
```

Mutable event with capture/target/bubble context and cancellation flags.
Events created through the pool may be reused after dispatch/release; copy
needed values rather than retaining a pooled event object.

Related types: [Event](Event-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](TimerEvent-class/constructor-constructor.md) |
| `data` | public, inherited | [open](TimerEvent-class/data-property.md) |
| `static ACTIVATE` | public, inherited | [open](TimerEvent-class/static-ACTIVATE-property.md) |
| `static ADDED` | public, inherited | [open](TimerEvent-class/static-ADDED-property.md) |
| `static ADDED_TO_STAGE` | public, inherited | [open](TimerEvent-class/static-ADDED_TO_STAGE-property.md) |
| `static CHANGE` | public, inherited | [open](TimerEvent-class/static-CHANGE-property.md) |
| `static CHANGING` | public, inherited | [open](TimerEvent-class/static-CHANGING-property.md) |
| `static CLOSE` | public, inherited | [open](TimerEvent-class/static-CLOSE-property.md) |
| `static COMPLETE` | public, inherited | [open](TimerEvent-class/static-COMPLETE-property.md) |
| `static CONNECT` | public, inherited | [open](TimerEvent-class/static-CONNECT-property.md) |
| `static DEACTIVATE` | public, inherited | [open](TimerEvent-class/static-DEACTIVATE-property.md) |
| `static ENDED` | public, inherited | [open](TimerEvent-class/static-ENDED-property.md) |
| `static ENTER_FRAME` | public, inherited | [open](TimerEvent-class/static-ENTER_FRAME-property.md) |
| `static FOCUS_IN` | public, inherited | [open](TimerEvent-class/static-FOCUS_IN-property.md) |
| `static FOCUS_OUT` | public, inherited | [open](TimerEvent-class/static-FOCUS_OUT-property.md) |
| `static LEAVE_STAGE` | public, inherited | [open](TimerEvent-class/static-LEAVE_STAGE-property.md) |
| `static LOOP_COMPLETE` | public, inherited | [open](TimerEvent-class/static-LOOP_COMPLETE-property.md) |
| `static REMOVED` | public, inherited | [open](TimerEvent-class/static-REMOVED-property.md) |
| `static REMOVED_FROM_STAGE` | public, inherited | [open](TimerEvent-class/static-REMOVED_FROM_STAGE-property.md) |
| `static RENDER` | public, inherited | [open](TimerEvent-class/static-RENDER-property.md) |
| `static RESIZE` | public, inherited | [open](TimerEvent-class/static-RESIZE-property.md) |
| `static SOUND_COMPLETE` | public, inherited | [open](TimerEvent-class/static-SOUND_COMPLETE-property.md) |
| `static TIMER` | public | [open](TimerEvent-class/static-TIMER-property.md) |
| `static TIMER_COMPLETE` | public | [open](TimerEvent-class/static-TIMER_COMPLETE-property.md) |
| `bubbles` | public, inherited | [open](TimerEvent-class/bubbles-accessor.md) |
| `cancelable` | public, inherited | [open](TimerEvent-class/cancelable-accessor.md) |
| `currentTarget` | public, inherited | [open](TimerEvent-class/currentTarget-accessor.md) |
| `eventPhase` | public, inherited | [open](TimerEvent-class/eventPhase-accessor.md) |
| `isPropagationImmediateStopped` | public, inherited | [open](TimerEvent-class/isPropagationImmediateStopped-accessor.md) |
| `isPropagationStopped` | public, inherited | [open](TimerEvent-class/isPropagationStopped-accessor.md) |
| `target` | public, inherited | [open](TimerEvent-class/target-accessor.md) |
| `type` | public, inherited | [open](TimerEvent-class/type-accessor.md) |
| `clean` | protected, inherited | [open](TimerEvent-class/clean-method.md) |
| `isDefaultPrevented` | public, inherited | [open](TimerEvent-class/isDefaultPrevented-method.md) |
| `preventDefault` | public, inherited | [open](TimerEvent-class/preventDefault-method.md) |
| `resetForPool` | public, inherited | [open](TimerEvent-class/resetForPool-method.md) |
| `setCurrentTarget` | public, inherited | [open](TimerEvent-class/setCurrentTarget-method.md) |
| `setDispatchContext` | public, inherited | [open](TimerEvent-class/setDispatchContext-method.md) |
| `stopImmediatePropagation` | public, inherited | [open](TimerEvent-class/stopImmediatePropagation-method.md) |
| `stopPropagation` | public, inherited | [open](TimerEvent-class/stopPropagation-method.md) |
| `updateAfterEvent` | public | [open](TimerEvent-class/updateAfterEvent-method.md) |
| `static create` | public, inherited | [open](TimerEvent-class/static-create-method.md) |
| `static dispatch` | public, inherited | [open](TimerEvent-class/static-dispatch-method.md) |
| `static dispatchTimerEvent` | public | [open](TimerEvent-class/static-dispatchTimerEvent-method.md) |
| `static release` | public, inherited | [open](TimerEvent-class/static-release-method.md) |
