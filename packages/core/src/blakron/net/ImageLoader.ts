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

	/** Default cross-origin mode applied to newly created loaders. */
	public static crossOrigin?: string;

	// ── Instance fields ───────────────────────────────────────────────────────

	/** Bitmap data from the most recently completed image request. */
	public data?: BitmapData;
	/** Cross-origin mode applied to the next image request, when specified. */
	public crossOrigin?: string = ImageLoader.crossOrigin;

	private _img?: HTMLImageElement;

	// ── Public methods ────────────────────────────────────────────────────────

	/** Start loading an image URL, cancelling any previous request first. */
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
