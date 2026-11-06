# Native callback ownership

Available in UI 5.0.0 with Core ^3.0.0. Callbacks own their instance binding.

| API | Source signature |
| --- | --- |
| Animation | `new Animation(updateFunction)` |
| Watcher constructor | `new Watcher(property, handler?, next?)` |
| Watcher.watch | `Watcher.watch(host, chain, handler?)` |
| Watcher.setHandler | `watcher.setHandler(handler)` |
| Binding.bindHandler | `Binding.bindHandler(host, chain, handler)` |

These callbacks run without an injected receiver. Use stable arrow members or
bind a method once if it accesses instance state. Animation supplies itself as
the update/end callback argument; Watcher and Binding supply the observed value.
Watcher constructor's third argument is an optional downstream Watcher.

Binding.bindHandler calls the handler synchronously with the initial value;
Watcher.watch does not. Both initial and later calls use the same unbound
contract. Replacing a handler updates the downstream chain without emitting
another initial value. Reset detaches the previous host before observing a new
one. Retain the returned Watcher and call unwatch() when its owner is released.

Animation.stop() unregisters its ticker callback and does not call endFunction.
Natural completion calls the final update, stops the animation, then calls
endFunction once. Callback exceptions propagate. TouchScroll retains its own
stable update callback so bounce/throw animation continues to update the owner.

EventDispatcher's event receiver and Component's host-aware Skin factory are
separate existing contracts and are unchanged. DragonBones event adapter
receivers follow its upstream protocol.
