# static bindProperties

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
static bindProperties(host: unknown, templates: unknown[], chainIndex: number[], target: unknown, prop: string): Watcher | undefined;
```

Binds a mixture of literal values and property chains to a string property.

`chainIndex` identifies entries in `templates` that contain property chains.
With multiple template entries, replaces watched entries with Watchers and
returns only the last one. Keep/unwatch every Watcher in templates on disposal;
the returned Watcher alone does not clean up all bindings. The single-chain,
single-entry fast path instead returns bindProperty's Watcher without changing
templates. Assignment is immediate and errors propagate synchronously.

```ts
import { EventDispatcher } from '@kurot/core';
import { Binding, Label, Watcher } from '@kurot/ui';

const score = Object.assign(new EventDispatcher(), { hits: 0, total: 10 });
const label = new Label();
const templates: unknown[] = ['hits', ' / ', 'total'];
Binding.bindProperties(score, templates, [0, 2], label, 'text');
function disposeScoreBinding(): void {
  for (const entry of templates) {
    if (entry instanceof Watcher) {
      entry.unwatch();
    }
  }
}
disposeScoreBinding();
```

Related types: [Watcher](../Watcher-class.md).
