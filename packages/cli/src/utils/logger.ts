const reset = '\x1b[0m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const dim = '\x1b[2m';

const tag = `${cyan}[kurot]${reset}`;

let enabled = true;

/**
 * Writes human-readable logs only when logging is enabled.
 */
function write(method: 'log' | 'warn' | 'error', message: string): void {
	if (!enabled) return;
	console[method](message);
}

/**
 * Enables or suppresses human-readable logger output.
 * Machine-readable diagnostic modes disable it to keep stdout parseable.
 */
export function setLoggerEnabled(value: boolean): void {
	enabled = value;
}

/**
 * Human-readable CLI logger with a consistent Kurot prefix and severity color.
 */
export const logger = {
	/**
	 * Writes an informational message.
	 */
	info: (msg: string): void => write('log', `${tag} ${msg}`),

	/**
	 * Writes a successful-operation message.
	 */
	success: (msg: string): void => write('log', `${tag} ${green}${msg}${reset}`),

	/**
	 * Writes a warning message.
	 */
	warn: (msg: string): void => write('warn', `${tag} ${yellow}${msg}${reset}`),

	/**
	 * Writes an error message.
	 */
	error: (msg: string): void => write('error', `${tag} ${red}${msg}${reset}`),

	/**
	 * Writes a build-stage message.
	 */
	step: (msg: string): void => write('log', `${tag} ${dim}›${reset} ${msg}`),
};
