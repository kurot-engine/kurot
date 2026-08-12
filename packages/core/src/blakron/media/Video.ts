import { DisplayObject } from '../display/DisplayObject.js';
import { BitmapData } from '../display/texture/BitmapData.js';
import { Event } from '../events/Event.js';
import { IOErrorEvent } from '../events/IOErrorEvent.js';
import { Rectangle } from '../geom/Rectangle.js';
import { ImageLoader } from '../net/ImageLoader.js';

export class Video extends DisplayObject {
	// ── Instance fields ───────────────────────────────────────────────────────

	public fullscreen = true;

	private _video: HTMLVideoElement;
	private _src = '';
	private _poster = '';
	private _posterData?: BitmapData;
	private _loop = false;
	private _loaded = false;
	private _bitmapData?: BitmapData;
	private _widthSet = NaN;
	private _heightSet = NaN;
	private _waiting = false;
	private _userPause = false;
	private _userPlay = false;
	private _isPlayed = false;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(url?: string) {
		super();
		this._video = document.createElement('video');
		this._video.setAttribute('playsinline', '');
		this._video.setAttribute('webkit-playsinline', 'true');
		this._video.controls = false;

		this._video.addEventListener('canplaythrough', this.onVideoLoaded);
		this._video.addEventListener('ended', this.onVideoEnded);
		this._video.addEventListener('error', this.onVideoError);
		this._video.addEventListener('waiting', () => {
			this._waiting = true;
		});
		this._video.addEventListener('canplay', () => {
			this._waiting = false;
			if (this._userPause) this.pause();
			else if (this._userPlay) this.videoPlay();
		});

		if (url) this.load(url);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get src(): string {
		return this._src;
	}
	public set src(value: string) {
		this._src = value;
		this._video.src = value;
	}

	public get poster(): string {
		return this._poster;
	}
	public set poster(value: string) {
		if (this._poster === value) return;
		this._poster = value;
		if (value) this.loadPoster(value);
	}

	public get volume(): number {
		return this._video.volume;
	}
	public set volume(value: number) {
		this._video.volume = Math.max(0, Math.min(1, value));
	}

	public get position(): number {
		return this._video.currentTime;
	}
	public set position(value: number) {
		this._video.currentTime = value;
	}

	public get paused(): boolean {
		return this._video.paused;
	}

	public get length(): number {
		return this._video.duration || 0;
	}

	public get bitmapData(): BitmapData | undefined {
		if (!this._video || !this._loaded) return this._posterData;
		if (!this._bitmapData) {
			this._video.width = this._video.videoWidth;
			this._video.height = this._video.videoHeight;
			this._bitmapData = new BitmapData(this._video);
			this._bitmapData.deleteSource = false;
		}
		// Invalidate each access so dependent Bitmaps redraw the current video frame
		BitmapData.invalidate(this._bitmapData);
		return this._bitmapData;
	}

	public override get width(): number {
		return isNaN(this._widthSet) ? this.getPlayWidth() : this._widthSet;
	}
	public override set width(value: number) {
		this._widthSet = value;
		this.$renderDirty = true;
	}

	public override get height(): number {
		return isNaN(this._heightSet) ? this.getPlayHeight() : this._heightSet;
	}
	public override set height(value: number) {
		this._heightSet = value;
		this.$renderDirty = true;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public load(url: string): void {
		this._src = url;
		this._loaded = false;

		const video = this._video;
		if (url.startsWith('http://') || url.startsWith('https://')) {
			video.crossOrigin = 'anonymous';
		}
		video.src = url;
		video.load();
	}

	public play(startTime?: number, loop = false): void {
		if (!this._loaded) {
			this.load(this._src);
			this.once(Event.COMPLETE, () => this.play(startTime, loop));
			return;
		}
		this._isPlayed = true;
		this._loop = loop;
		this._video.loop = loop;
		if (startTime !== undefined) this._video.currentTime = startTime;

		if (this.fullscreen) {
			this.enterFullscreen();
		} else {
			this.videoPlay();
		}
	}

	public pause(): void {
		this._userPlay = false;
		if (this._waiting) {
			this._userPause = true;
			return;
		}
		this._userPause = false;
		this._video.pause();
	}

	public close(): void {
		this._video.removeEventListener('canplaythrough', this.onVideoLoaded);
		this._video.removeEventListener('ended', this.onVideoEnded);
		this._video.removeEventListener('error', this.onVideoError);
		this._video.pause();
		this._video.src = '';
		this._loaded = false;
		this._bitmapData = undefined;
		this._isPlayed = false;
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	override $measureContentBounds(bounds: Rectangle): void {
		const w = this.getPlayWidth();
		const h = this.getPlayHeight();
		if (w > 0 && h > 0) bounds.setTo(0, 0, w, h);
		else bounds.setEmpty();
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private videoPlay(): void {
		this._userPause = false;
		if (this._waiting) {
			this._userPlay = true;
			return;
		}
		this._userPlay = false;
		this._video.play();
	}

	private enterFullscreen(): void {
		const video = this._video;
		// Append to body so fullscreen API works
		if (!video.parentElement) document.body.appendChild(video);

		void video.requestFullscreen();

		this.videoPlay();
	}

	private exitFullscreen(): void {
		if (document.fullscreenElement) void document.exitFullscreen();

		if (this._video.parentElement) {
			this._video.parentElement.removeChild(this._video);
		}
	}

	private loadPoster(url: string): void {
		const loader = new ImageLoader();
		loader.once(Event.COMPLETE, () => {
			if (loader.data) {
				this._posterData = loader.data;
				this._posterData.width = this.getPlayWidth() || loader.data.width;
				this._posterData.height = this.getPlayHeight() || loader.data.height;
				this.$renderDirty = true;
				this.$markDirty();
			}
		});
		loader.load(url);
	}

	private getPlayWidth(): number {
		if (!isNaN(this._widthSet)) return this._widthSet;
		if (this._bitmapData) return this._bitmapData.width;
		if (this._posterData) return this._posterData.width;
		if (this._video.videoWidth) return this._video.videoWidth;
		return 0;
	}

	private getPlayHeight(): number {
		if (!isNaN(this._heightSet)) return this._heightSet;
		if (this._bitmapData) return this._bitmapData.height;
		if (this._posterData) return this._posterData.height;
		if (this._video.videoHeight) return this._video.videoHeight;
		return 0;
	}

	private onVideoLoaded = (): void => {
		this._loaded = true;
		this._video.width = this._video.videoWidth;
		this._video.height = this._video.videoHeight;
		this.dispatchEventWith(Event.COMPLETE);
	};

	private onVideoEnded = (): void => {
		this.pause();
		this._isPlayed = false;
		if (this.fullscreen) this.exitFullscreen();
		this.dispatchEventWith(Event.ENDED);
	};

	private onVideoError = (): void => {
		IOErrorEvent.dispatchIOErrorEvent(this);
	};
}
