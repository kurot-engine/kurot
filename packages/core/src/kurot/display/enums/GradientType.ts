export const GradientType = {
	LINEAR: 'linear',
	RADIAL: 'radial',
} as const;

export type GradientType = (typeof GradientType)[keyof typeof GradientType];
