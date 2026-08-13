import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import evalRunSchema from './schemas/eval-run.schema.json';
import evalTaskSchema from './schemas/eval-task.schema.json';
import type { ErrorObject } from 'ajv';
import type { EvalRun, EvalTask } from './eval-types.js';

export interface EvalValidationIssue {
	readonly path: string;
	readonly keyword: string;
	readonly message: string;
}

export class EvalValidationError extends Error {
	public constructor(
		message: string,
		public readonly issues: readonly EvalValidationIssue[],
	) {
		super(message);
		this.name = 'EvalValidationError';
	}
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateTask = ajv.compile<EvalTask>(evalTaskSchema);
const validateRun = ajv.compile<EvalRun>(evalRunSchema);

export function parseEvalTask(input: unknown): EvalTask {
	if (validateTask(input)) return input;
	throw makeValidationError('Agent Eval task is invalid.', validateTask.errors ?? undefined);
}

export function parseEvalRun(input: unknown): EvalRun {
	if (validateRun(input)) return input;
	throw makeValidationError('Agent Eval run is invalid.', validateRun.errors ?? undefined);
}

function makeValidationError(message: string, errors?: readonly ErrorObject[]): EvalValidationError {
	const issues = (errors ?? []).map(error => ({
		path: error.instancePath || '/',
		keyword: error.keyword,
		message: error.message ?? 'Validation failed.',
	}));
	return new EvalValidationError(message, issues);
}
