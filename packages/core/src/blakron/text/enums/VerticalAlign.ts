export const VerticalAlign = {
	TOP: 'top',
	BOTTOM: 'bottom',
	MIDDLE: 'middle',
	JUSTIFY: 'justify',
	CONTENT_JUSTIFY: 'contentJustify',
} as const;

export type VerticalAlign = (typeof VerticalAlign)[keyof typeof VerticalAlign];
