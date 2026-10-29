# Timer

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class Timer extends EventDispatcher<TimerEvents>
```

Timer lets you run code on a specified time sequence.
Use start() to begin, and listen for TimerEvent.TIMER / TimerEvent.TIMER_COMPLETE.

Related types: [EventDispatcher](EventDispatcher-class.md), [TimerEvents](TimerEvents-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Timer-class/constructor-constructor.md) |
| `repeatCount` | public | [open](Timer-class/repeatCount-property.md) |
| `currentCount` | public | [open](Timer-class/currentCount-accessor.md) |
| `delay` | public | [open](Timer-class/delay-accessor.md) |
| `running` | public | [open](Timer-class/running-accessor.md) |
| `addEventListener` | public, inherited | [open](Timer-class/addEventListener-method.md) |
| `dispatchEvent` | public, inherited | [open](Timer-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](Timer-class/dispatchEventWith-method.md) |
| `hasEventListener` | public, inherited | [open](Timer-class/hasEventListener-method.md) |
| `notifyListener` | protected, inherited | [open](Timer-class/notifyListener-method.md) |
| `once` | public, inherited | [open](Timer-class/once-method.md) |
| `removeEventListener` | public, inherited | [open](Timer-class/removeEventListener-method.md) |
| `reset` | public | [open](Timer-class/reset-method.md) |
| `start` | public | [open](Timer-class/start-method.md) |
| `stop` | public | [open](Timer-class/stop-method.md) |
| `willTrigger` | public, inherited | [open](Timer-class/willTrigger-method.md) |
