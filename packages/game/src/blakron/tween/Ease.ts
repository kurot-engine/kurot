import type { EaseFunction } from './types.js';

/**
 * Easing functions for normalized progress values.
 *
 * Functions do not clamp input, allowing callers to intentionally use easing
 * curves that overshoot outside the usual [0, 1] range.
 */
export const Ease = {
	// ── Linear ───────────────────────────────────────────────────────────────
	linear: (t: number): number => t,

	// ── Configurable factories ────────────────────────────────────────────────
	/** Produces an adjustable quadratic curve; amount is clamped to [-1, 1]. */
	get: (amount: number): EaseFunction => {
		const a = Math.max(-1, Math.min(1, amount));
		return (t: number): number => {
			if (a === 0) return t;
			if (a < 0) return t * (t * -a + 1 + a);
			return t * ((2 - t) * a + (1 - a));
		};
	},

	getPowIn:
		(pow: number): EaseFunction =>
		(t: number): number =>
			Math.pow(t, pow),

	getPowOut:
		(pow: number): EaseFunction =>
		(t: number): number =>
			1 - Math.pow(1 - t, pow),

	getPowInOut:
		(pow: number): EaseFunction =>
		(t: number): number => {
			const t2 = t * 2;
			if (t2 < 1) return 0.5 * Math.pow(t2, pow);
			return 1 - 0.5 * Math.abs(Math.pow(2 - t2, pow));
		},

	// ── Sine ─────────────────────────────────────────────────────────────────
	sineIn: (t: number): number => 1 - Math.cos((t * Math.PI) / 2),
	sineOut: (t: number): number => Math.sin((t * Math.PI) / 2),
	sineInOut: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,

	// ── Quad ─────────────────────────────────────────────────────────────────
	quadIn: (t: number): number => t * t,
	quadOut: (t: number): number => t * (2 - t),
	quadInOut: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

	// ── Cubic ─────────────────────────────────────────────────────────────────
	cubicIn: (t: number): number => t * t * t,
	cubicOut: (t: number): number => --t * t * t + 1,
	cubicInOut: (t: number): number => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

	// ── Quart ─────────────────────────────────────────────────────────────────
	quartIn: (t: number): number => t * t * t * t,
	quartOut: (t: number): number => 1 - --t * t * t * t,
	quartInOut: (t: number): number => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),

	// ── Quint ─────────────────────────────────────────────────────────────────
	quintIn: (t: number): number => t * t * t * t * t,
	quintOut: (t: number): number => 1 + --t * t * t * t * t,
	quintInOut: (t: number): number => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t),

	// ── Expo ─────────────────────────────────────────────────────────────────
	expoIn: (t: number): number => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
	expoOut: (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
	expoInOut: (t: number): number => {
		if (t === 0) return 0;
		if (t === 1) return 1;
		return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
	},

	// ── Circ ─────────────────────────────────────────────────────────────────
	circIn: (t: number): number => 1 - Math.sqrt(1 - t * t),
	circOut: (t: number): number => Math.sqrt(1 - --t * t),
	circInOut: (t: number): number =>
		t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2,

	// ── Back ─────────────────────────────────────────────────────────────────
	getBackIn:
		(amount: number): EaseFunction =>
		(t: number): number =>
			t * t * ((amount + 1) * t - amount),

	getBackOut:
		(amount: number): EaseFunction =>
		(t: number): number =>
			--t * t * ((amount + 1) * t + amount) + 1,

	getBackInOut: (amount: number): EaseFunction => {
		const a = amount * 1.525;
		return (t: number): number => {
			const t2 = t * 2;
			if (t2 < 1) return 0.5 * (t2 * t2 * ((a + 1) * t2 - a));
			return 0.5 * ((t2 - 2) * (t2 - 2) * ((a + 1) * (t2 - 2) + a) + 2);
		};
	},

	backIn: (t: number): number => t * t * (2.70158 * t - 1.70158),
	backOut: (t: number): number => --t * t * (2.70158 * t + 1.70158) + 1,
	backInOut: (t: number): number => {
		const c2 = 1.70158 * 1.525;
		return t < 0.5
			? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
			: (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
	},

	// ── Elastic ───────────────────────────────────────────────────────────────
	getElasticIn: (amplitude: number, period: number): EaseFunction => {
		const pi2 = Math.PI * 2;
		return (t: number): number => {
			if (t === 0 || t === 1) return t;
			const s = (period / pi2) * Math.asin(1 / amplitude);
			return -(amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - s) * pi2) / period));
		};
	},

	getElasticOut: (amplitude: number, period: number): EaseFunction => {
		const pi2 = Math.PI * 2;
		return (t: number): number => {
			if (t === 0 || t === 1) return t;
			const s = (period / pi2) * Math.asin(1 / amplitude);
			return amplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * pi2) / period) + 1;
		};
	},

	getElasticInOut: (amplitude: number, period: number): EaseFunction => {
		const pi2 = Math.PI * 2;
		return (t: number): number => {
			if (t === 0 || t === 1) return t;
			const s = (period / pi2) * Math.asin(1 / amplitude);
			const t2 = t * 2;
			if (t2 < 1)
				return -0.5 * (amplitude * Math.pow(2, 10 * (t2 - 1)) * Math.sin(((t2 - 1 - s) * pi2) / period));
			return amplitude * Math.pow(2, -10 * (t2 - 1)) * Math.sin(((t2 - 1 - s) * pi2) / period) * 0.5 + 1;
		};
	},

	elasticIn: (t: number): number => {
		if (t === 0) return 0;
		if (t === 1) return 1;
		return -Math.pow(2, 10 * t - 10) * Math.sin(((t * 10 - 10.75) * (2 * Math.PI)) / 3);
	},
	elasticOut: (t: number): number => {
		if (t === 0) return 0;
		if (t === 1) return 1;
		return Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1;
	},
	elasticInOut: (t: number): number => {
		if (t === 0) return 0;
		if (t === 1) return 1;
		return t < 0.5
			? -(Math.pow(2, 20 * t - 10) * Math.sin(((20 * t - 11.125) * (2 * Math.PI)) / 4.5)) / 2
			: (Math.pow(2, -20 * t + 10) * Math.sin(((20 * t - 11.125) * (2 * Math.PI)) / 4.5)) / 2 + 1;
	},

	// ── Bounce ────────────────────────────────────────────────────────────────
	bounceOut: (t: number): number => {
		const n1 = 7.5625;
		const d1 = 2.75;
		if (t < 1 / d1) return n1 * t * t;
		if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
		if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
		return n1 * (t -= 2.625 / d1) * t + 0.984375;
	},
	bounceIn: (t: number): number => 1 - Ease.bounceOut(1 - t),
	bounceInOut: (t: number): number =>
		t < 0.5 ? (1 - Ease.bounceOut(1 - 2 * t)) / 2 : (1 + Ease.bounceOut(2 * t - 1)) / 2,

	/**
	 * Creates a custom cubic-bezier easing function.
	 *
	 * The supplied progress is an x-coordinate. The corresponding curve
	 * parameter is found with Newton iteration, falling back to bounded binary
	 * search near flat derivatives, then used to sample the y-coordinate.
	 */
	cubicBezier(x1: number, y1: number, x2: number, y2: number): EaseFunction {
		const sampleX = (t: number): number => 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t;
		const sampleY = (t: number): number => 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t;
		const sampleXDerivative = (t: number): number =>
			3 * x1 * (1 - t) * (1 - t) + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;

		return (progress: number): number => {
			let t = progress;
			for (let i = 0; i < 8; i++) {
				const error = sampleX(t) - progress;
				if (Math.abs(error) < 1e-6) {
					return sampleY(t);
				}
				const derivative = sampleXDerivative(t);
				if (Math.abs(derivative) < 1e-6) {
					break;
				}
				const next = t - error / derivative;
				if (next < 0 || next > 1) {
					break;
				}
				t = next;
			}

			let lower = 0;
			let upper = 1;
			t = progress;
			for (let i = 0; i < 24; i++) {
				const value = sampleX(t);
				if (Math.abs(value - progress) < 1e-6) {
					break;
				}
				if (value < progress) {
					lower = t;
				} else {
					upper = t;
				}
				t = (lower + upper) / 2;
			}
			return sampleY(t);
		};
	},
} as const;
