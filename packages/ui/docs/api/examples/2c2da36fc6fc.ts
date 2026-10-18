import { EventDispatcher } from '@kurot/core';
import { Watcher, PropertyEvent } from '@kurot/ui';

const host = Object.assign(new EventDispatcher(), { name: 'Player' });
const watcher = Watcher.watch(host, ['name'], value => console.log(value));
host.name = 'Ada';
PropertyEvent.dispatchPropertyEvent(host, 'name');
watcher?.unwatch();

export {};
