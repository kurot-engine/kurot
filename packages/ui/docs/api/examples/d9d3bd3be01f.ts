import { EventDispatcher } from '@kurot/core';
import { Binding } from '@kurot/ui';

const user = Object.assign(new EventDispatcher(), { name: 'Player' });
const watcher = Binding.bindHandler(user, ['name'], value => console.log(value), undefined);
watcher?.unwatch();

export {};
