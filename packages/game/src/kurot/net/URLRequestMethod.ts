/**
 * HTTP request method constants used by URLRequest.
 */
export const URLRequestMethod = {
	GET: 'get',
	POST: 'post',
} as const;

export type URLRequestMethod = (typeof URLRequestMethod)[keyof typeof URLRequestMethod];
