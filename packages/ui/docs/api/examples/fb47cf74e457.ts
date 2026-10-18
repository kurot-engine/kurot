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

export {};
