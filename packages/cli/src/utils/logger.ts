const reset = '\x1b[0m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const dim = '\x1b[2m';

const tag = `${cyan}[blakron]${reset}`;

export const logger = {
	info: (msg: string): void => console.log(`${tag} ${msg}`),
	success: (msg: string): void => console.log(`${tag} ${green}${msg}${reset}`),
	warn: (msg: string): void => console.warn(`${tag} ${yellow}${msg}${reset}`),
	error: (msg: string): void => console.error(`${tag} ${red}${msg}${reset}`),
	/**
	 * Logs a single pipeline step, indented under the current command.
	 */
	step: (msg: string): void => console.log(`${tag} ${dim}›${reset} ${msg}`),
};
