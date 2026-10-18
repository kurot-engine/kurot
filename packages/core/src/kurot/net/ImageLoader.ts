import { EventDispatcher } from '../events/EventDispatcher.js';
import { Event, type EventMap } from '../events/Event.js';
import { IOErrorEvent } from '../events/IOErrorEvent.js';
import { BitmapData } from '../display/texture/BitmapData.js';

export interface ImageLoaderEvents extends EventMap {
	[Event.COMPLETE]: Event;
	[IOErrorEvent.IO_ERROR]: IOErrorEvent;
}

/**
 * Event-driven browser image loader.
 *
 * `load()` replaces and cancels a prior image request. `close()` detaches the
 * browser handlers and clears the image source, preventing cancelled requests
 * from updating data or dispatching an event later.
 */
export class ImageLoader extends EventDispatcher<ImageLoaderEvents> {
	// ── Static fields ─────────────────────────────────────────────────────────

	/**
	 * Default cross-origin mode copied by new loaders; initially undefined. Changing
	 * it does not update existing instances or bypass server CORS restrictions.
	 */
	public static crossOrigin?: string;

	// ── Instance fields ───────────────────────────────────────────────────────

	/**
	 * Most recently completed BitmapData, initially undefined. close() retains it;
	 * a new request does not clear an earlier result. Read after COMPLETE. The caller
	 * owns disposal after all textures/users of this bitmap data have released it.
	 */
	public data?: BitmapData;
	/**
	 * Cross-origin mode for the next request, copied from ImageLoader.crossOrigin
	 * at construction. Initially undefined; browser image/CORS rules apply.
	 */
	public crossOrigin?: string = ImageLoader.crossOrigin;

	private _img?: HTMLImageElement;

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Start an image URL request, cancelling the prior request first. Success
	 * replaces data and emits COMPLETE; browser load failure emits IO_ERROR and leaves
	 * the previous data available. Replaced bitmap data is not automatically disposed.
	 */
	public load(url: string): void {
		this.close();

		const img = new Image();
		this._img = img;

		if (this.crossOrigin) img.crossOrigin = this.crossOrigin;

		img.onload = () => {
			this.data = new BitmapData(img);
			this.dispatchEventWith(Event.COMPLETE);
		};
		img.onerror = () => {
			IOErrorEvent.dispatchIOErrorEvent(this);
		};

		img.src = url;
	}

	/**
	 * Cancel an in-flight image request.
	 *
	 * The most recently loaded `data` value is retained; only the active browser
	 * image element and its pending callbacks are released.
	 */
	public close(): void {
		if (this._img) {
			this._img.onload = null;
			this._img.onerror = null;
			this._img.src = '';
			this._img = undefined;
		}
	}
}
