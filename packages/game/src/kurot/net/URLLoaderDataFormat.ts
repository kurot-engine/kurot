/**
 * Constants for `URLLoader.dataFormat`.
 */
export const URLLoaderDataFormat = {
	TEXT: 'text',
	BINARY: 'binary',
	JSON: 'json',
	TEXTURE: 'texture',
	SOUND: 'sound',
} as const;

export type URLLoaderDataFormat = (typeof URLLoaderDataFormat)[keyof typeof URLLoaderDataFormat];
