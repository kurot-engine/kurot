import { EventDispatcher } from '@kurot/core';
import { Binding, Label, PropertyEvent } from '@kurot/ui';

const user = Object.assign(new EventDispatcher(), { name: 'Player' });
const label = new Label();
const watcher = Binding.bindProperty(user, ['name'], label, 'text');
user.name = 'Ada';
PropertyEvent.dispatchPropertyEvent(user, 'name');
watcher?.unwatch();

export {};
