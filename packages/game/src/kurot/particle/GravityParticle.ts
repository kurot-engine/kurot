import { Particle } from './Particle.js';

export class GravityParticle extends Particle {
	// ── Instance fields ───────────────────────────────────────────────────────

	public startX = 0;
	public startY = 0;
	public velocityX = 0;
	public velocityY = 0;
	public radialAcceleration = 0;
	public tangentialAcceleration = 0;
	public rotationDelta = 0;
	public scaleDelta = 0;
	public alphaDelta = 0;

	// ── Public methods ────────────────────────────────────────────────────────

	public override reset(): void {
		super.reset();
		this.startX = 0;
		this.startY = 0;
		this.velocityX = 0;
		this.velocityY = 0;
		this.radialAcceleration = 0;
		this.tangentialAcceleration = 0;
		this.rotationDelta = 0;
		this.scaleDelta = 0;
	}
}
