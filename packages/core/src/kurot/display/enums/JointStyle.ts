export const JointStyle = {
	BEVEL: 'bevel',
	MITER: 'miter',
	ROUND: 'round',
} as const;

export type JointStyle = (typeof JointStyle)[keyof typeof JointStyle];
