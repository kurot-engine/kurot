/**
 * Owns exactly one wake-up. Catch-up frames use separate tasks so promises from
 * one frame settle before the next. Periodic timer yields bound catch-up CPU use.
 */
export class TickerScheduler {
	private _raf?: number;
	private _timeout?: ReturnType<typeof setTimeout>;
	private _channel?: MessageChannel;
	private _generation = 0;
	private _batchStart = 0;
	private _batchFrames = 0;

	public constructor(private readonly _wake: () => void) {}

	public schedule(hidden: boolean, catchUp: boolean): void {
		this.cancel();
		const generation = this._generation;
		const wake = (): void => {
			if (generation !== this._generation) {
				return;
			}
			this._raf = undefined;
			this._timeout = undefined;
			this._wake();
		};
		if (catchUp) {
			if (!this._batchFrames) {
				this._batchStart = performance.now();
			}
			if (++this._batchFrames >= 120 || performance.now() - this._batchStart >= 8) {
				this._batchFrames = 0;
				this._timeout = setTimeout(wake, 0);
			} else {
				this._channel ??= new MessageChannel();
				this._channel.port1.onmessage = event => {
					if (event.data === generation) {
						wake();
					}
				};
				this._channel.port2.postMessage(generation);
			}
		} else if (hidden) {
			this._batchFrames = 0;
			this._timeout = setTimeout(wake, 1000);
		} else {
			this._batchFrames = 0;
			this._raf = requestAnimationFrame(wake);
		}
	}

	public cancel(): void {
		this._generation++;
		if (this._raf !== undefined) {
			cancelAnimationFrame(this._raf);
			this._raf = undefined;
		}
		if (this._timeout !== undefined) {
			clearTimeout(this._timeout);
			this._timeout = undefined;
		}
	}

	public dispose(): void {
		this.cancel();
		this._channel?.port1.close();
		this._channel?.port2.close();
		this._channel = undefined;
		this._batchFrames = 0;
	}
}
