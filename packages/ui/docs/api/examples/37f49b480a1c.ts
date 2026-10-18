import { Event, IOErrorEvent } from '@kurot/core';
import { Theme } from '@kurot/ui';

const theme = new Theme('resource/default.thm.json');
theme.once(Event.COMPLETE, () => console.log('Theme and skin module ready'));
theme.once(IOErrorEvent.IO_ERROR, () => console.error('Theme failed'));

export {};
