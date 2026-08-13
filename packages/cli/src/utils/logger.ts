const reset = '\x1b[0m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const dim = '\x1b[2m';

const tag = `${cyan}[kurot]${reset}`;

let enabled = true;

function write(method: 'log' | 'warn' | 'error', message: string): void {
	if (!enabled) return;
	console[method](message);
}

export function setLoggerEnabled(value: boolean): void {
	enabled = value;
}

export const logger = {
	info: (msg: string): void => write('log', `${tag} ${msg}`),
	success: (msg: string): void => write('log', `${tag} ${green}${msg}${reset}`),
	warn: (msg: string): void => write('warn', `${tag} ${yellow}${msg}${reset}`),
	error: (msg: string): void => write('error', `${tag} ${red}${msg}${reset}`),
	/**
	 * Logs a single pipeline step, indented under the current command.
	 */
	step: (msg: string): void => write('log', `${tag} ${dim}›${reset} ${msg}`),
};
