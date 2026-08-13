export { DIAGNOSTIC_CODES, isStrictDiagnosticCode } from './codes.js';
export type { DiagnosticCode } from './codes.js';
export { DiagnosticCollector } from './collector.js';
export type { Diagnostic, DiagnosticPolicy, DiagnosticSeverity, SourceLocation } from './types.js';
export {
	parseBuildDiagnosticsFormat,
	parseDevDiagnosticsFormat,
	writeMachineOutput,
} from './output.js';
export type {
	BuildDiagnosticsFormat,
	BuildResultOutput,
	DevDiagnosticsFormat,
	DevEvent,
} from './output.js';
