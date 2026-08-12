import { ResourceItem } from '../ResourceItem.js';
import { AnalyzerBase } from './AnalyzerBase.js';
import { HttpRequest } from '../../net/HttpRequest.js';
import { HttpResponseType } from '../../net/HttpResponseType.js';
import { Event } from '../../events/Event.js';
import { IOErrorEvent } from '../../events/IOErrorEvent.js';

/**
 * Text analyzer — loads text files as strings.
 */
export class TextAnalyzer extends AnalyzerBase {
	/**
	 * Load a text resource.
	 */
	public loadFile(item: ResourceItem): Promise<ResourceItem> {
		if (this.fileDic.has(item.name)) {
			item.loaded = true;
			return Promise.resolve(item);
		}

		return new Promise<ResourceItem>(resolve => {
			const request = new HttpRequest();
			request.responseType = HttpResponseType.TEXT;

			const onComplete = (): void => {
				cleanup();
				const response = request.response as string;
				if (response !== undefined) {
					this.fileDic.set(item.name, response);
					item.loaded = true;
				} else {
					item.loaded = false;
				}
				resolve(item);
			};

			const onError = (): void => {
				cleanup();
				item.loaded = false;
				resolve(item);
			};

			const cleanup = (): void => {
				request.removeEventListener(Event.COMPLETE, onComplete);
				request.removeEventListener(IOErrorEvent.IO_ERROR, onError);
			};

			request.addEventListener(Event.COMPLETE, onComplete);
			request.addEventListener(IOErrorEvent.IO_ERROR, onError);
			request.open(item.url);
			request.send();
		});
	}
}
