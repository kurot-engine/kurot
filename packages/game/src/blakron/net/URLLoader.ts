import {
	EventDispatcher,
	Event,
	IOErrorEvent,
	ProgressEvent,
	HttpRequest,
	HttpResponseType,
	ImageLoader,
	Texture,
	Sound,
	type EventMap,
} from '@kurot/core';
import type { URLRequest } from './URLRequest.js';
import { URLLoaderDataFormat } from './URLLoaderDataFormat.js';
import { URLRequestMethod } from './URLRequestMethod.js';
import { URLVariables } from './URLVariables.js';

export interface URLLoaderEvents extends EventMap {
	[Event.COMPLETE]: Event;
	[IOErrorEvent.IO_ERROR]: IOErrorEvent;
	[ProgressEvent.PROGRESS]: ProgressEvent;
}

/**
 * High-level resource loader, Egret-compatible.
 *
 * Delegates to the appropriate core loader based on `dataFormat`,
 * then populates `data` and dispatches `Event.COMPLETE`.
 *
 * @example
 * ```ts
 * const loader = new URLLoader();
 * loader.dataFormat = URLLoaderDataFormat.JSON;
 * loader.addEventListener(Event.COMPLETE, () => console.log(loader.data));
 * loader.addEventListener(IOErrorEvent.IO_ERROR, () => console.error('failed'));
 * loader.load(new URLRequest('data/config.json'));
 * ```
 */
export class URLLoader extends EventDispatcher<URLLoaderEvents> {
	// ── Instance fields ───────────────────────────────────────────────────────

	public dataFormat: URLLoaderDataFormat = URLLoaderDataFormat.TEXT;
	public data: unknown;

	private _xhr?: HttpRequest;
	private _imageLoader?: ImageLoader;
	private _sound?: Sound;

	// ── Constructor ───────────────────────────────────────────────────────────

	/**
	 * @param request Optional URLRequest to load immediately on construction.
	 */
	public constructor(request?: URLRequest) {
		super();
		if (request) {
			this.load(request);
		}
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Start loading from the specified URL.
	 */
	public load(request: URLRequest): void {
		this.close();
		this.data = undefined;

		switch (this.dataFormat) {
			case URLLoaderDataFormat.TEXTURE:
				this._loadTexture(request);
				break;
			case URLLoaderDataFormat.SOUND:
				this._loadSound(request);
				break;
			default:
				this._loadXhr(request);
				break;
		}
	}

	/**
	 * Abort any in-flight request and release internal loader references.
	 */
	public close(): void {
		if (this._xhr) {
			this._xhr.removeEventListener(Event.COMPLETE, this._handleXhrComplete);
			this._xhr.removeEventListener(IOErrorEvent.IO_ERROR, this._handleError);
			this._xhr.removeEventListener(ProgressEvent.PROGRESS, this._handleProgress);
			this._xhr.abort();
			this._xhr = undefined;
		}
		if (this._imageLoader) {
			this._imageLoader.removeEventListener(Event.COMPLETE, this._handleImageComplete);
			this._imageLoader.removeEventListener(IOErrorEvent.IO_ERROR, this._handleError);
			this._imageLoader.close();
			this._imageLoader = undefined;
		}
		if (this._sound) {
			this._sound.removeEventListener(Event.COMPLETE, this._handleSoundComplete);
			this._sound.removeEventListener(IOErrorEvent.IO_ERROR, this._handleError);
			this._sound.close();
			this._sound = undefined;
		}
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _loadXhr(request: URLRequest): void {
		const xhr = new HttpRequest();
		this._xhr = xhr;

		xhr.responseType = this._toHttpResponseType();

		xhr.addEventListener(Event.COMPLETE, this._handleXhrComplete);
		xhr.addEventListener(IOErrorEvent.IO_ERROR, this._handleError);
		xhr.addEventListener(ProgressEvent.PROGRESS, this._handleProgress);

		const isGet = request.method !== URLRequestMethod.POST;
		const url =
			isGet && request.data instanceof URLVariables
				? this._appendQueryString(request.url, request.data)
				: request.url;

		xhr.open(url, request.method as Parameters<HttpRequest['open']>[1]);

		let sendData: string | ArrayBuffer | undefined;
		if (isGet) {
			// URLVariables on a GET request is encoded into the URL above, not sent as a body.
			sendData = request.data instanceof URLVariables ? undefined : request.data;
		} else if (request.data instanceof URLVariables) {
			const hasContentType = request.requestHeaders.some(h => h.name.toLowerCase() === 'content-type');
			if (!hasContentType) {
				xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			}
			sendData = request.data.toString();
		} else {
			sendData = request.data;
		}

		for (const header of request.requestHeaders) {
			xhr.setRequestHeader(header.name, header.value);
		}

		xhr.send(sendData);
	}

	private _appendQueryString(url: string, variables: URLVariables): string {
		const query = variables.toString();
		if (!query) return url;
		return url + (url.includes('?') ? '&' : '?') + query;
	}

	private _loadTexture(request: URLRequest): void {
		const loader = new ImageLoader();
		this._imageLoader = loader;

		loader.addEventListener(Event.COMPLETE, this._handleImageComplete);
		loader.addEventListener(IOErrorEvent.IO_ERROR, this._handleError);

		loader.load(request.url);
	}

	private _loadSound(request: URLRequest): void {
		const sound = new Sound();
		this._sound = sound;

		sound.addEventListener(Event.COMPLETE, this._handleSoundComplete);
		sound.addEventListener(IOErrorEvent.IO_ERROR, this._handleError);

		sound.load(request.url);
	}

	private _handleXhrComplete = (_e: Event): void => {
		const response = this._xhr?.response;

		switch (this.dataFormat) {
			case URLLoaderDataFormat.JSON:
				try {
					this.data = JSON.parse(response as string);
				} catch {
					this._dispatchError();
					return;
				}
				break;
			case URLLoaderDataFormat.BINARY:
				this.data = response as ArrayBuffer;
				break;
			default:
				this.data = response as string;
				break;
		}

		this.dispatchEventWith(Event.COMPLETE);
	};

	private _handleImageComplete = (_e: Event): void => {
		const bitmapData = this._imageLoader?.data;
		if (!bitmapData) {
			this._dispatchError();
			return;
		}
		const texture = new Texture();
		texture.setBitmapData(bitmapData);
		this.data = texture;
		this.dispatchEventWith(Event.COMPLETE);
	};

	private _handleSoundComplete = (_e: Event): void => {
		this.data = this._sound;
		this.dispatchEventWith(Event.COMPLETE);
	};

	private _handleError = (_e: Event): void => {
		this._dispatchError();
	};

	private _handleProgress = (e: ProgressEvent): void => {
		ProgressEvent.dispatchProgressEvent(this, ProgressEvent.PROGRESS, e.bytesLoaded, e.bytesTotal);
	};

	private _dispatchError(): void {
		IOErrorEvent.dispatchIOErrorEvent(this);
	}

	private _toHttpResponseType(): HttpResponseType {
		switch (this.dataFormat) {
			case URLLoaderDataFormat.BINARY:
				return HttpResponseType.ARRAY_BUFFER;
			default:
				return HttpResponseType.TEXT;
		}
	}
}
