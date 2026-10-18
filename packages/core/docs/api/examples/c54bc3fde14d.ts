import { Event, EventDispatcher } from '@kurot/core';

const events = new EventDispatcher();
const onComplete = (event: Event): void => console.log(event.type);
events.addEventListener(Event.COMPLETE, onComplete);
events.dispatchEventWith(Event.COMPLETE);
events.removeEventListener(Event.COMPLETE, onComplete);

export {};
