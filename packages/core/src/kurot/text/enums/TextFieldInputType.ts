export const TextFieldInputType = {
	TEXT: 'text',
	TEL: 'tel',
	PASSWORD: 'password',
} as const;

export type TextFieldInputType = (typeof TextFieldInputType)[keyof typeof TextFieldInputType];
