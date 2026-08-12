export const HorizontalAlign = {
	LEFT: 'left',
	RIGHT: 'right',
	CENTER: 'center',
	JUSTIFY: 'justify',
	CONTENT_JUSTIFY: 'contentJustify',
} as const;

export type HorizontalAlign = (typeof HorizontalAlign)[keyof typeof HorizontalAlign];
