import { Event, IOErrorEvent } from '@kurot/core';
import { URLLoader, URLLoaderDataFormat, URLRequest } from '@kurot/game';

const loader = new URLLoader();
loader.dataFormat = URLLoaderDataFormat.JSON;
loader.addEventListener(Event.COMPLETE, () => console.log(loader.data));
loader.addEventListener(IOErrorEvent.IO_ERROR, () => console.error('failed'));
loader.load(new URLRequest('data/config.json'));

export {};
