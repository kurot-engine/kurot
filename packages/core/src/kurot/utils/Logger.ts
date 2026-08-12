export const enum LogLevel {
	ALL = 0,
	DEBUG = 1,
	INFO = 2,
	WARN = 3,
	ERROR = 4,
	OFF = 5,
}

let currentLevel: LogLevel = LogLevel.ALL;

export const Logger = {
	get logLevel(): LogLevel {
		return currentLevel;
	},

	set logLevel(level: LogLevel) {
		currentLevel = level;
	},

	debug(...args: unknown[]): void {
		if (currentLevel <= LogLevel.DEBUG) console.debug(...args);
	},

	info(...args: unknown[]): void {
		if (currentLevel <= LogLevel.INFO) console.info(...args);
	},

	warn(...args: unknown[]): void {
		if (currentLevel <= LogLevel.WARN) console.warn(...args);
	},

	error(...args: unknown[]): void {
		if (currentLevel <= LogLevel.ERROR) console.error(...args);
	},
};
