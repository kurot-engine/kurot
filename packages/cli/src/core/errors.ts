/**
 * A build step failed. Thrown by the CLI's `build` command and caught at the
 * top level to print a friendly error instead of a raw stack trace.
 */
export class BuildError extends Error {
	public constructor(
		message: string,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = 'BuildError';
	}
}

/**
 * `kurot.config.ts` failed validation (e.g. a missing entry file or an
 * invalid `stage.scaleMode`).
 */
export class ConfigError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'ConfigError';
	}
}
