/**
 * Response body formats supported by HttpRequest.
 *
 * TEXT returns a string response; ARRAY_BUFFER returns the raw binary body.
 */
export const HttpResponseType = {
	TEXT: 'text',
	ARRAY_BUFFER: 'arraybuffer',
} as const;

/** Union of the response body formats supported by HttpRequest. */
export type HttpResponseType = (typeof HttpResponseType)[keyof typeof HttpResponseType];
