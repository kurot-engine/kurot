import { Bitmap } from '../display/Bitmap.js';
import { BitmapData } from '../display/texture/BitmapData.js';
import { Texture } from '../display/texture/Texture.js';
import { Event } from '../events/Event.js';
import { IOErrorEvent } from '../events/IOErrorEvent.js';
import { ImageLoader } from '../net/ImageLoader.js';

export class Video extends Bitmap {
	// ── Instance fields ───────────────────────────────────────────────────────
	public fullscreen = true;

	private readonly _video: HTMLVideoElement;
	private _src = '';
	private _poster = '';
	private _posterData?: BitmapData;
	private _videoData?: BitmapData;
	private _videoTexture?: Texture;
	private _loaded = false;
	private _waiting = false;
	private _userPause = false;
	private _userPlay = false;
	private _isPlayed = false;
	private _frameCallbackId?: number;
	private _usesAnimationFrame = false;

	// ── Constructor ───────────────────────────────────────────────────────────
	public constructor(url?: string) {
		super();
		this._video = document.createElement('video');
		this._video.playsInline = true;
		this._video.setAttribute('webkit-playsinline', 'true');
		this._video.controls = false;

		this._video.addEventListener('canplaythrough', this.onVideoLoaded);
		this._video.addEventListener('ended', this.onVideoEnded);
		this._video.addEventListener('error', this.onVideoError);
		this._video.addEventListener('waiting', this.onVideoWaiting);
		this._video.addEventListener('canplay', this.onVideoCanPlay);

		if (url) {
			this.load(url);
		}
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
		if (this._poster === value) {
			return;
		}
		this._poster = value;
		if (value) {
			this.loadPoster(value);
		}
	}

	public get volume(): number {
		return this._video.volume;
	}
	public set volume(value: number) {
		this._video.volume = Math.max(0, Math.min(1, value));
	}

	public get muted(): boolean {
		return this._video.muted;
	}
	public set muted(value: boolean) {
		this._video.muted = value;
		this._video.defaultMuted = value;
	}

	public get loop(): boolean {
		return this._video.loop;
	}
	public set loop(value: boolean) {
		this._video.loop = value;
	}

	public get playsInline(): boolean {
		return this._video.playsInline;
	}
	public set playsInline(value: boolean) {
		this._video.playsInline = value;
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

	// ── Public methods ────────────────────────────────────────────────────────
	public load(url: string): void {
		this.cancelFrameUpdates();
		this._src = url;
		this._loaded = false;
		this._isPlayed = false;
		this.texture = this.makePosterTexture();

		if (url.startsWith('http://') || url.startsWith('https://')) {
			this._video.crossOrigin = 'anonymous';
		}
		this._video.src = url;
		this._video.load();
	}

	public play(startTime?: number, loop = false): void {
		if (!this._loaded) {
			this.load(this._src);
			this.once(Event.COMPLETE, () => this.play(startTime, loop));
			return;
		}
		this._isPlayed = true;
		this.loop = loop;
		this.texture = this._videoTexture;
		if (startTime !== undefined) {
			this._video.currentTime = startTime;
		}

		if (this.fullscreen) {
			this.enterFullscreen();
		} else {
			this.videoPlay();
		}
	}

	public pause(): void {
		this._userPlay = false;
		this.cancelFrameUpdates();
		if (this._waiting) {
			this._userPause = true;
			return;
		}
		this._userPause = false;
		this._video.pause();
	}

	public close(): void {
		this.cancelFrameUpdates();
		this._video.pause();
		this._video.removeEventListener('canplaythrough', this.onVideoLoaded);
		this._video.removeEventListener('ended', this.onVideoEnded);
		this._video.removeEventListener('error', this.onVideoError);
		this._video.removeEventListener('waiting', this.onVideoWaiting);
		this._video.removeEventListener('canplay', this.onVideoCanPlay);
		this._video.removeAttribute('src');
		this._video.load();
		this._loaded = false;
		this._isPlayed = false;
		this.texture = this.makePosterTexture();
		this._videoData = undefined;
		this._videoTexture = undefined;
	}

	// ── Private methods ───────────────────────────────────────────────────────
	private videoPlay(): void {
		this._userPause = false;
		if (this._waiting) {
			this._userPlay = true;
			return;
		}
		this._userPlay = false;
		void this._video.play().then(() => this.scheduleFrameUpdate()).catch(() => {
			IOErrorEvent.dispatchIOErrorEvent(this);
		});
	}

	private enterFullscreen(): void {
		if (!this._video.parentElement) {
			document.body.appendChild(this._video);
		}
		void this._video.requestFullscreen();
		this.videoPlay();
	}

	private exitFullscreen(): void {
		if (document.fullscreenElement) {
			void document.exitFullscreen();
		}
		this._video.remove();
	}

	private loadPoster(url: string): void {
		const loader = new ImageLoader();
		loader.once(Event.COMPLETE, () => {
			if (!loader.data) return;
			this._posterData = loader.data;
			if (!this._isPlayed) {
				this.texture = this.makePosterTexture();
			}
		});
		loader.load(url);
	}

	private makePosterTexture(): Texture | undefined {
		if (!this._posterData) return undefined;
		const texture = new Texture();
		texture.disposeBitmapData = false;
		texture.setBitmapData(this._posterData);
		return texture;
	}

	private scheduleFrameUpdate(): void {
		if (!this._isPlayed || this._frameCallbackId !== undefined) return;
		if (typeof this._video.requestVideoFrameCallback === 'function') {
			this._usesAnimationFrame = false;
			this._frameCallbackId = this._video.requestVideoFrameCallback(this.onVideoFrame);
		} else {
			this._usesAnimationFrame = true;
			this._frameCallbackId = requestAnimationFrame(this.onAnimationFrame);
		}
	}

	private cancelFrameUpdates(): void {
		if (this._frameCallbackId === undefined) return;
		if (this._usesAnimationFrame) {
			cancelAnimationFrame(this._frameCallbackId);
		} else {
			this._video.cancelVideoFrameCallback(this._frameCallbackId);
		}
		this._frameCallbackId = undefined;
	}

	private updateVideoFrame(): void {
		BitmapData.invalidate(this._videoData);
	}

	private onVideoLoaded = (): void => {
		this._loaded = true;
		const bitmapData = new BitmapData(this._video);
		bitmapData.deleteSource = false;
		bitmapData.width = this._video.videoWidth;
		bitmapData.height = this._video.videoHeight;

		const texture = new Texture();
		texture.disposeBitmapData = false;
		texture.setBitmapData(bitmapData);
		this._videoData = bitmapData;
		this._videoTexture = texture;
		this.texture = texture;
		this.dispatchEventWith(Event.COMPLETE);
	};

	private onVideoEnded = (): void => {
		this.cancelFrameUpdates();
		this._isPlayed = false;
		if (this.fullscreen) {
			this.exitFullscreen();
		}
		this.dispatchEventWith(Event.ENDED);
	};

	private onVideoError = (): void => {
		IOErrorEvent.dispatchIOErrorEvent(this);
	};

	private onVideoWaiting = (): void => {
		this._waiting = true;
	};

	private onVideoCanPlay = (): void => {
		this._waiting = false;
		if (this._userPause) {
			this.pause();
		} else if (this._userPlay) {
			this.videoPlay();
		}
	};

	private onVideoFrame = (): void => {
		this._frameCallbackId = undefined;
		this.updateVideoFrame();
		this.scheduleFrameUpdate();
	};

	private onAnimationFrame = (): void => {
		this._frameCallbackId = undefined;
		this.updateVideoFrame();
		this.scheduleFrameUpdate();
	};
}
