import {
	DisplayObject,
	Event,
	Matrix,
	NumberUtils,
	Rectangle,
	Texture,
	ticker,
	getTimer,
	type RenderObjectType,
} from '@kurot/core';
import { Particle } from './Particle.js';

// ── Region helper for bounds calculation ──────────────────────────────────────

let regionPool: Region[] = [];

class Region {
	minX = 0;
	minY = 0;
	maxX = 0;
	maxY = 0;

	static release(r: Region): void {
		r.setEmpty();
		regionPool.push(r);
	}

	static create(): Region {
		const r = regionPool.pop();
		if (r) return r;
		return new Region();
	}

	setEmpty(): void {
		this.minX = 0;
		this.minY = 0;
		this.maxX = 0;
		this.maxY = 0;
	}

	updateRegion(rect: Rectangle, matrix: Matrix): void {
		const m = matrix;
		const a = m.a;
		const b = m.b;
		const c = m.c;
		const d = m.d;
		const tx = m.tx;
		const ty = m.ty;

		const x = rect.x;
		const y = rect.y;
		const xMax = x + rect.width;
		const yMax = y + rect.height;

		let minX: number;
		let minY: number;
		let maxX: number;
		let maxY: number;

		if (a === 1 && b === 0 && c === 0 && d === 1) {
			minX = x + tx;
			minY = y + ty;
			maxX = xMax + tx;
			maxY = yMax + ty;
		} else {
			const x0 = a * x + c * y + tx;
			const y0 = b * x + d * y + ty;
			const x1 = a * xMax + c * y + tx;
			const y1 = b * xMax + d * y + ty;
			const x2 = a * xMax + c * yMax + tx;
			const y2 = b * xMax + d * yMax + ty;
			const x3 = a * x + c * yMax + tx;
			const y3 = b * x + d * yMax + ty;

			let tmp: number;

			minX = x0;
			maxX = x0;
			if (x1 < minX) minX = x1;
			else if (x1 > maxX) maxX = x1;
			if (x2 < minX) minX = x2;
			else if (x2 > maxX) maxX = x2;
			if (x3 < minX) minX = x3;
			else if (x3 > maxX) maxX = x3;

			minY = y0;
			maxY = y0;
			if (y1 < minY) minY = y1;
			else if (y1 > maxY) maxY = y1;
			if (y2 < minY) minY = y2;
			else if (y2 > maxY) maxY = y2;
			if (y3 < minY) minY = y3;
			else if (y3 > maxY) maxY = y3;
		}

		this.minX = minX - 1;
		this.minY = minY - 1;
		this.maxX = maxX + 1;
		this.maxY = maxY + 1;
	}
}

// ── ParticleSystem ────────────────────────────────────────────────────────────

export class ParticleSystem extends DisplayObject {
	// ── Static fields ─────────────────────────────────────────────────────────

	/**
	 * Custom $renderObjectType for particle systems.
	 * Value 6 — extends the core RenderObjectType enum without modifying core.
	 */
	public static readonly RENDER_TYPE_PARTICLE = 6;

	// ── Instance fields ─────────────────────────────────────────────────────────

	/**
	 * Remaining emission time in milliseconds. A value of -1 emits indefinitely.
	 */
	public emissionTime = -1;
	public texture: Texture;
	public maxParticles = 200;
	public numParticles = 0;
	/**
	 * Particle constructor used when the pool is empty. Defaults to Particle.
	 */
	public particleClass?: new () => Particle;

	protected _emitterX = 0;
	protected _emitterY = 0;

	private readonly _pool: Particle[] = [];
	private readonly _particles: Particle[] = [];
	private _emissionRate: number;
	private _frameTime = 0;
	private _emitterBounds?: Rectangle;
	private _relativeContentBounds?: Rectangle;
	private _timeStamp = 0;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(texture: Texture, emissionRate: number) {
		super();
		this._emissionRate = this.validateEmissionRate(emissionRate);
		this.texture = texture;
		this.$renderObjectType = ParticleSystem.RENDER_TYPE_PARTICLE as RenderObjectType;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Read-only access to the active particles array.
	 * The renderer iterates this to draw each particle.
	 */
	public get particles(): readonly Particle[] {
		return this._particles;
	}

	/**
	 * Interval between particle emissions in milliseconds. Zero disables emission.
	 */
	public get emissionRate(): number {
		return this._emissionRate;
	}
	public set emissionRate(value: number) {
		this._emissionRate = this.validateEmissionRate(value);
	}

	/**
	 * The emitter bounds rectangle (relative to the emitter point).
	 */
	public get emitterBounds(): Rectangle | undefined {
		return this._emitterBounds;
	}
	public set emitterBounds(rect: Rectangle | undefined) {
		this._emitterBounds = rect;
		this.updateRelativeBounds(rect);
	}

	/**
	 * Emitter X position.
	 * @default 0
	 */
	public get emitterX(): number {
		return this._emitterX;
	}
	public set emitterX(value: number) {
		this._emitterX = value;
		this.updateRelativeBounds(this._emitterBounds);
	}

	/**
	 * Emitter Y position.
	 * @default 0
	 */
	public get emitterY(): number {
		return this._emitterY;
	}
	public set emitterY(value: number) {
		this._emitterY = value;
		this.updateRelativeBounds(this._emitterBounds);
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Start emitting particles.
	 * @param duration Total emission time in ms. -1 = infinite.
	 */
	public start(duration = -1): void {
		if (this.emissionRate === 0) return;

		this.emissionTime = duration;
		this._timeStamp = getTimer();
		ticker.startTick(this._update, this);
	}

	/**
	 * Stop emitting particles.
	 * @param clear Whether to remove all existing particles immediately.
	 */
	public stop(clear = false): void {
		this.emissionTime = 0;
		if (clear) {
			this.clear();
			ticker.stopTick(this._update, this);
		}
	}

	/**
	 * Set the number of current particles directly (up to maxParticles).
	 */
	public setCurrentParticles(num: number): void {
		for (let i = this.numParticles; i < num && this.numParticles < this.maxParticles; i++) {
			this.addOneParticle();
		}
	}

	/**
	 * Change the particle texture.
	 */
	public changeTexture(texture: Texture): void {
		if (this.texture !== texture) {
			this.texture = texture;
		}
	}

	/**
	 * Override to initialise a newly created particle.
	 * @param particle The particle to initialise.
	 */
	public initParticle(particle: Particle): void {
		particle.x = this._emitterX;
		particle.y = this._emitterY;
		particle.currentTime = 0;
		particle.totalTime = 1000;
	}

	/**
	 * Override to advance a particle by dt milliseconds.
	 * @param _particle The particle to advance.
	 * @param _dt Delta time in ms.
	 */
	public advanceParticle(_particle: Particle, _dt: number): void {
		// Default: simple upward drift
	}

	// ── Overrides ─────────────────────────────────────────────────────────────

	public override $measureContentBounds(bounds: Rectangle): void {
		if (this._relativeContentBounds) {
			bounds.copyFrom(this._relativeContentBounds);
			return;
		}

		if (this.numParticles > 0) {
			const texture = this.texture;
			const textureW = Math.round(texture.scaleBitmapWidth);
			const textureH = Math.round(texture.scaleBitmapHeight);

			let totalRect: Rectangle | undefined;

			for (let i = 0; i < this.numParticles; i++) {
				const particle = this._particles[i];
				this._transformForMeasure.identity();
				this.appendTransform(
					this._transformForMeasure,
					particle.x,
					particle.y,
					particle.scale,
					particle.scale,
					particle.rotation,
					0,
					0,
					textureW / 2,
					textureH / 2,
				);

				this._particleMeasureRect.setEmpty();
				this._particleMeasureRect.width = textureW;
				this._particleMeasureRect.height = textureH;

				const tmpRegion = Region.create();
				tmpRegion.updateRegion(this._particleMeasureRect, this._transformForMeasure);

				if (i === 0) {
					totalRect = Rectangle.create();
					totalRect.setTo(
						tmpRegion.minX,
						tmpRegion.minY,
						tmpRegion.maxX - tmpRegion.minX,
						tmpRegion.maxY - tmpRegion.minY,
					);
				} else {
					const l = Math.min(totalRect!.x, tmpRegion.minX);
					const t = Math.min(totalRect!.y, tmpRegion.minY);
					const r = Math.max(totalRect!.right, tmpRegion.maxX);
					const b = Math.max(totalRect!.bottom, tmpRegion.maxY);
					totalRect!.setTo(l, t, r - l, b - t);
				}
				Region.release(tmpRegion);
			}

			if (totalRect) {
				this._lastRect = totalRect;
				bounds.setTo(totalRect.x, totalRect.y, totalRect.width, totalRect.height);
				Rectangle.release(totalRect);
			}
		} else {
			if (this._lastRect) {
				const lastRect = this._lastRect;
				bounds.setTo(lastRect.x, lastRect.y, lastRect.width, lastRect.height);
				Rectangle.release(lastRect);
				this._lastRect = undefined;
			}
		}
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private readonly _particleMeasureRect = new Rectangle();
	private readonly _transformForMeasure = new Matrix();
	private _lastRect?: Rectangle;

	private _update = (timeStamp: number): boolean => {
		const dt = timeStamp - this._timeStamp;
		this._timeStamp = timeStamp;

		if (this.emissionTime === -1 || this.emissionTime > 0) {
			this._frameTime += dt;
			while (this._frameTime > 0) {
				if (this.numParticles < this.maxParticles) {
					this.addOneParticle();
				}
				this._frameTime -= this.emissionRate;
			}
			if (this.emissionTime !== -1) {
				this.emissionTime -= dt;
				if (this.emissionTime < 0) {
					this.emissionTime = 0;
				}
			}
		}

		let particleIndex = 0;
		while (particleIndex < this.numParticles) {
			const particle = this._particles[particleIndex];
			if (particle.currentTime < particle.totalTime) {
				this.advanceParticle(particle, dt);
				particle.currentTime += dt;
				particleIndex++;
			} else {
				this.removeParticle(particle);
			}
		}

		this.$markDirty();

		if (this.numParticles === 0 && this.emissionTime === 0) {
			ticker.stopTick(this._update, this);
			this.dispatchEventWith(Event.COMPLETE);
		}

		return false;
	};

	private getParticle(): Particle {
		if (this._pool.length) {
			return this._pool.pop()!;
		}
		if (this.particleClass) {
			return new this.particleClass();
		}
		return new Particle();
	}

	private validateEmissionRate(value: number): number {
		if (!Number.isFinite(value) || value < 0) {
			throw new RangeError('Particle emissionRate must be a finite non-negative number.');
		}
		return value;
	}

	private removeParticle(particle: Particle): boolean {
		const index = this._particles.indexOf(particle);
		if (index !== -1) {
			particle.reset();
			this._particles.splice(index, 1);
			this._pool.push(particle);
			this.numParticles--;
			return true;
		}
		return false;
	}

	private clear(): void {
		while (this._particles.length) {
			this.removeParticle(this._particles[0]);
		}
		this.numParticles = 0;
		this._pool.length = 0;
		this.$markDirty();
	}

	private addOneParticle(): void {
		const particle = this.getParticle();
		this.initParticle(particle);
		if (particle.totalTime > 0) {
			this._particles.push(particle);
			this.numParticles++;
		}
	}

	private updateRelativeBounds(emitterRect: Rectangle | undefined): void {
		if (emitterRect) {
			if (!this._relativeContentBounds) {
				this._relativeContentBounds = new Rectangle();
			}
			this._relativeContentBounds.copyFrom(emitterRect);
			this._relativeContentBounds.x += this._emitterX;
			this._relativeContentBounds.y += this._emitterY;
		} else {
			this._relativeContentBounds = undefined;
		}
	}

	private appendTransform(
		matrix: Matrix,
		x: number,
		y: number,
		scaleX: number,
		scaleY: number,
		rotation: number,
		_skewX: number,
		_skewY: number,
		regX: number,
		regY: number,
	): Matrix {
		let cos: number;
		let sin: number;
		if (rotation % 360) {
			cos = NumberUtils.cos(rotation);
			sin = NumberUtils.sin(rotation);
		} else {
			cos = 1;
			sin = 0;
		}

		matrix.append(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, x, y);

		if (regX || regY) {
			matrix.tx -= regX * matrix.a + regY * matrix.c;
			matrix.ty -= regX * matrix.b + regY * matrix.d;
		}

		return matrix;
	}
}
