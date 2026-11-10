/**
 * Accumulates elapsed wall time without ever using a catch-up jump as a frame.
 * The owner samples pause/stop boundaries even when the browser delivers no ticks.
 */
export class LogicClock {
	public pending = 0;
	private _time: number;
	private _wall: number;

	public constructor(now: number) {
		this._time = now;
		this._wall = now;
	}

	public get time(): number {
		// Preserve Date.now()'s integer-millisecond precision. Repeated fractional
		// deltas otherwise delay exact-duration Tween boundaries by a full frame.
		return Math.ceil(this._time - 0.000001);
	}

	public sample(now: number, paused: boolean): void {
		const elapsed = Math.max(0, now - this._wall);
		this._wall = Math.max(now, this._wall);
		if (!paused) {
			this.pending += elapsed;
		}
	}

	public rebase(now: number): void {
		this._wall = now;
	}

	public hasStep(step: number): boolean {
		return this.pending + 0.001 >= step;
	}

	public advance(step: number): void {
		this.pending = Math.max(0, this.pending - step);
		this._time += step;
	}
}
