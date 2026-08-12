export const TextFieldType = {
	DYNAMIC: 'dynamic',
	INPUT: 'input',
} as const;

export type TextFieldType = (typeof TextFieldType)[keyof typeof TextFieldType];
