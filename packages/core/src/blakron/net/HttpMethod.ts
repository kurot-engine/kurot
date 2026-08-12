/**
 * HTTP methods supported by HttpRequest.
 *
 * Values intentionally use the uppercase tokens expected by XMLHttpRequest.
 */
export const HttpMethod = {
	GET: 'GET',
	POST: 'POST',
} as const;

/** Union of the HTTP method values supported by HttpRequest. */
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
