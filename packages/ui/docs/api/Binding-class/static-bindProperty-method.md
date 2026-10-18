# static bindProperty

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
static bindProperty(host: unknown, chain: string[], target: unknown, prop: string): Watcher | undefined;
```

Binds a property chain on `host` to a target property.
Assigns the initial value synchronously. An empty chain returns undefined.
Hosts along the chain must dispatch PROPERTY_CHANGE; ordinary assignment
alone is not observed. Retain the returned Watcher and unwatch it when the
owning view closes. Assignment/handler errors propagate synchronously.

```ts
import { EventDispatcher } from '@kurot/core';
import { Binding, Label, PropertyEvent } from '@kurot/ui';

const user = Object.assign(new EventDispatcher(), { name: 'Player' });
const label = new Label();
const watcher = Binding.bindProperty(user, ['name'], label, 'text');
user.name = 'Ada';
PropertyEvent.dispatchPropertyEvent(user, 'name');
watcher?.unwatch();
```

Related types: [Watcher](../Watcher-class.md).
