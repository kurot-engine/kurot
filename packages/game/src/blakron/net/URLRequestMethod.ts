/**
 * HTTP request method constants, Egret-compatible.
 */
export const URLRequestMethod = {
	GET: 'get',
	POST: 'post',
} as const;

export type URLRequestMethod = (typeof URLRequestMethod)[keyof typeof URLRequestMethod];
