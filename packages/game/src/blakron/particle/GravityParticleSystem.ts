import { NumberUtils, Rectangle, Texture } from '@blakron/core';
import { GravityParticle } from './GravityParticle.js';
import { Particle } from './Particle.js';
import { ParticleSystem } from './ParticleSystem.js';

// ── Particle config (JSON format from Particle Designer) ────────────────────────

export interface ParticleConfig {
	emitter: { x?: number; y?: number };
	emitterVariance: { x?: number; y?: number };
	gravity: { x?: number; y?: number };
	emitterRect?: { x?: number; y?: number; width?: number; height?: number };
	useEmitterRect?: boolean;
	maxParticles?: number;
	speed?: number;
	speedVariance?: number;
	lifespan?: number;
	lifespanVariance?: number;
	emitAngle?: number;
	emitAngleVariance?: number;
	startSize?: number;
	startSizeVariance?: number;
	endSize?: number;
	endSizeVariance?: number;
	startRotation?: number;
	startRotationVariance?: number;
	endRotation?: number;
	endRotationVariance?: number;
	radialAcceleration?: number;
	radialAccelerationVariance?: number;
	tangentialAcceleration?: number;
	tangentialAccelerationVariance?: number;
	startAlpha?: number;
	startAlphaVariance?: number;
	endAlpha?: number;
	endAlphaVariance?: number;
	blendMode?: number;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function getValue(value: unknown): number {
	if (typeof value === 'undefined') return 0;
	return value as number;
}

// ── GravityParticleSystem ─────────────────────────────────────────────────────

export class GravityParticleSystem extends ParticleSystem {
	// ── Private fields ────────────────────────────────────────────────────────

	private _config: ParticleConfig;

	private _emitterXVariance = 0;
	private _emitterYVariance = 0;

	private _lifespan = 0;
	private _lifespanVariance = 0;

	private _startSize = 0;
	private _startSizeVariance = 0;
	private _endSize = 0;
	private _endSizeVariance = 0;

	private _emitAngle = 0;
	private _emitAngleVariance = 0;

	private _startRotation = 0;
	private _startRotationVariance = 0;
	private _endRotation = 0;
	private _endRotationVariance = 0;

	private _speed = 0;
	private _speedVariance = 0;

	private _gravityX = 0;
	private _gravityY = 0;

	private _radialAcceleration = 0;
	private _radialAccelerationVariance = 0;
	private _tangentialAcceleration = 0;
	private _tangentialAccelerationVariance = 0;

	private _startAlpha = 0;
	private _startAlphaVariance = 0;
	private _endAlpha = 0;
	private _endAlphaVariance = 0;

	private _particleBlendMode = 0;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(texture: Texture, config: ParticleConfig) {
		super(texture, 200);
		this._config = config;
		this.parseConfig();
		this.emissionRate = this._lifespan / this.maxParticles;
		this.particleClass = GravityParticle;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public override initParticle(particle: Particle): void {
		const locParticle = particle as GravityParticle;

		const lifespan = GravityParticleSystem.getValue(this._lifespan, this._lifespanVariance);

		locParticle.currentTime = 0;
		locParticle.totalTime = lifespan > 0 ? lifespan : 0;

		if (lifespan <= 0) return;

		locParticle.x = GravityParticleSystem.getValue(this._emitterX, this._emitterXVariance);
		locParticle.y = GravityParticleSystem.getValue(this._emitterY, this._emitterYVariance);
		locParticle.startX = this._emitterX;
		locParticle.startY = this._emitterY;

		const angle = GravityParticleSystem.getValue(this._emitAngle, this._emitAngleVariance);
		const spd = GravityParticleSystem.getValue(this._speed, this._speedVariance);
		locParticle.velocityX = spd * NumberUtils.cos(angle);
		locParticle.velocityY = spd * NumberUtils.sin(angle);

		locParticle.radialAcceleration = GravityParticleSystem.getValue(
			this._radialAcceleration,
			this._radialAccelerationVariance,
		);
		locParticle.tangentialAcceleration = GravityParticleSystem.getValue(
			this._tangentialAcceleration,
			this._tangentialAccelerationVariance,
		);

		let startSize = GravityParticleSystem.getValue(this._startSize, this._startSizeVariance);
		if (startSize < 0.1) startSize = 0.1;
		let endSize = GravityParticleSystem.getValue(this._endSize, this._endSizeVariance);
		if (endSize < 0.1) endSize = 0.1;

		const textureWidth = this.texture.textureWidth;
		locParticle.scale = startSize / textureWidth;
		locParticle.scaleDelta = (endSize - startSize) / lifespan / textureWidth;

		const startRotation = GravityParticleSystem.getValue(this._startRotation, this._startRotationVariance);
		const endRotation = GravityParticleSystem.getValue(this._endRotation, this._endRotationVariance);
		locParticle.rotation = startRotation;
		locParticle.rotationDelta = (endRotation - startRotation) / lifespan;

		const startAlpha = GravityParticleSystem.getValue(this._startAlpha, this._startAlphaVariance);
		const endAlpha = GravityParticleSystem.getValue(this._endAlpha, this._endAlphaVariance);

		locParticle.alpha = startAlpha;
		locParticle.alphaDelta = (endAlpha - startAlpha) / lifespan;

		locParticle.blendMode = this._particleBlendMode;
	}

	public override advanceParticle(particle: Particle, dt: number): void {
		const locParticle = particle as GravityParticle;
		const dtSec = dt / 1000;

		const restTime = locParticle.totalTime - locParticle.currentTime;
		const actualDt = restTime > dtSec ? dtSec : restTime;

		const distanceX = locParticle.x - locParticle.startX;
		const distanceY = locParticle.y - locParticle.startY;
		let distanceScalar = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
		if (distanceScalar < 0.01) distanceScalar = 0.01;

		let radialX = distanceX / distanceScalar;
		let radialY = distanceY / distanceScalar;

		const tangentialX = radialX;
		const tangentialY = radialY;

		radialX *= locParticle.radialAcceleration;
		radialY *= locParticle.radialAcceleration;

		const temp = tangentialX;
		const finalTangentialX = -tangentialY * locParticle.tangentialAcceleration;
		const finalTangentialY = temp * locParticle.tangentialAcceleration;

		locParticle.velocityX += actualDt * (this._gravityX + radialX + finalTangentialX);
		locParticle.velocityY += actualDt * (this._gravityY + radialY + finalTangentialY);
		locParticle.x += locParticle.velocityX * actualDt;
		locParticle.y += locParticle.velocityY * actualDt;

		locParticle.scale += locParticle.scaleDelta * actualDt * 1000;
		if (locParticle.scale < 0) locParticle.scale = 0;
		locParticle.rotation += locParticle.rotationDelta * actualDt * 1000;
		locParticle.alpha += locParticle.alphaDelta * actualDt * 1000;
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private parseConfig(): void {
		const config = this._config;

		this.emitterX = getValue(config.emitter.x);
		this.emitterY = getValue(config.emitter.y);
		this._emitterXVariance = getValue(config.emitterVariance.x);
		this._emitterYVariance = getValue(config.emitterVariance.y);

		this._gravityX = getValue(config.gravity.x);
		this._gravityY = getValue(config.gravity.y);

		if (config.useEmitterRect === true && config.emitterRect) {
			const bounds = new Rectangle();
			bounds.x = getValue(config.emitterRect.x);
			bounds.y = getValue(config.emitterRect.y);
			bounds.width = getValue(config.emitterRect.width);
			bounds.height = getValue(config.emitterRect.height);
			this.emitterBounds = bounds;
		}

		this.maxParticles = getValue(config.maxParticles);

		this._speed = getValue(config.speed);
		this._speedVariance = getValue(config.speedVariance);

		this._lifespan = Math.max(0.01, getValue(config.lifespan));
		this._lifespanVariance = getValue(config.lifespanVariance);

		this._emitAngle = getValue(config.emitAngle);
		this._emitAngleVariance = getValue(config.emitAngleVariance);

		this._startSize = getValue(config.startSize);
		this._startSizeVariance = getValue(config.startSizeVariance);
		this._endSize = getValue(config.endSize);
		this._endSizeVariance = getValue(config.endSizeVariance);

		this._startRotation = getValue(config.startRotation);
		this._startRotationVariance = getValue(config.startRotationVariance);
		this._endRotation = getValue(config.endRotation);
		this._endRotationVariance = getValue(config.endRotationVariance);

		this._radialAcceleration = getValue(config.radialAcceleration);
		this._radialAccelerationVariance = getValue(config.radialAccelerationVariance);
		this._tangentialAcceleration = getValue(config.tangentialAcceleration);
		this._tangentialAccelerationVariance = getValue(config.tangentialAccelerationVariance);

		this._startAlpha = getValue(config.startAlpha);
		this._startAlphaVariance = getValue(config.startAlphaVariance);
		this._endAlpha = getValue(config.endAlpha);
		this._endAlphaVariance = getValue(config.endAlphaVariance);

		this._particleBlendMode = getValue(config.blendMode);
	}

	private static getValue(base: number, variance: number): number {
		return base + variance * (Math.random() * 2 - 1);
	}
}
