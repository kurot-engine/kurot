# static bindHandler

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
static bindHandler(host: unknown, chain: string[], handler: (value: unknown) => void, thisObject: unknown): Watcher | undefined;
```

Binds a property chain on `host` to a handler function.
Calls the handler synchronously with the initial value before returning.
An empty chain returns undefined without calling the handler. Changes need
PROPERTY_CHANGE notifications; exceptions propagate. The caller must unwatch
the returned Watcher on disposal, independently of stage removal.

```ts
import { EventDispatcher } from '@kurot/core';
import { Binding } from '@kurot/ui';

const user = Object.assign(new EventDispatcher(), { name: 'Player' });
const watcher = Binding.bindHandler(user, ['name'], value => console.log(value), undefined);
watcher?.unwatch();
```

Related types: [Watcher](../Watcher-class.md).
