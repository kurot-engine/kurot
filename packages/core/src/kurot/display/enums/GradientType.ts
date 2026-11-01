/**
 * Gradient geometry for Graphics.beginGradientFill(); the optional gradient
 * matrix positions and scales it in the object's local coordinate space.
 */
export const GradientType = {
	LINEAR: 'linear',
	RADIAL: 'radial',
} as const;

export type GradientType = (typeof GradientType)[keyof typeof GradientType];
