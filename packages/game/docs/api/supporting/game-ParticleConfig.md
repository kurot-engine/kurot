# ParticleConfig

Supporting declaration from `@kurot/game`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
// ── Particle config (JSON format from Particle Designer) ────────────────────────
/**
 * Configuration accepted by GravityParticleSystem. Although several fields
 * are optional in the declaration, maxParticles must be positive in a usable
 * emitter. Lifespan values use milliseconds; emitter positions are local.
 */
export interface ParticleConfig {
    emitter: {
        x?: number;
        y?: number;
    };
    emitterVariance: {
        x?: number;
        y?: number;
    };
    gravity: {
        x?: number;
        y?: number;
    };
    emitterRect?: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    };
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
```
