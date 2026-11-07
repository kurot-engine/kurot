# static watch

Package: `@kurot/ui@5.1.0`. Generated from public declarations and JSDoc.

```ts
static watch(host: IEventDispatcher | undefined, chain: string[], handler?: (value: unknown) => void): Watcher | undefined;
```

Creates and starts a Watcher for a property chain.
Returns `undefined` when the chain is empty.
Does not emit an initial callback; read getValue() or use Binding.bindHandler
for that behavior. Each defined chain host must implement IEventDispatcher
and notify PROPERTY_CHANGE. Call unwatch() when its owner closes; errors from
property access or handlers propagate rather than becoming an error event.
Handlers run without a receiver; retain instance state with a stable arrow
member or a function bound once by its owner.

```ts
import { EventDispatcher } from '@kurot/core';
import { Watcher, PropertyEvent } from '@kurot/ui';

const host = Object.assign(new EventDispatcher(), { name: 'Player' });
const watcher = Watcher.watch(host, ['name'], value => console.log(value));
host.name = 'Ada';
PropertyEvent.dispatchPropertyEvent(host, 'name');
watcher?.unwatch();
```

Related types: [Watcher](../Watcher-class.md), [IEventDispatcher](../../../../core/docs/api/IEventDispatcher-interface.md).
