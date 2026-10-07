import { LB28, LineBreak, LineBreakClasses, MAY_BREAK, PASS, Rules } from '@cto.af/linebreak';
import { getGraphemeEndPositions, getWordSegments } from './TextSegmentation.js';

export interface LineBreakOpportunity {
	position: number;
	required: boolean;
}

const defaultRules = new Rules();
const emergencyRules = new Rules();
emergencyRules.rules = emergencyRules.rules.filter(rule => rule !== LB28);

/**
 * Unicode 17.0 UAX #14 boundaries, expressed as UTF-16 offsets.
 * The default profile is kept separate from dictionary and overflow tailoring
 * so it can be checked against Unicode's conformance corpus.
 */
export function getDefaultLineBreaks(text: string): LineBreakOpportunity[] {
	return Array.from(defaultRules.breaks(text), ({ position, required }) => ({ position, required }));
}

/**
 * Dictionary boundaries tailor complex-context scripts (Thai, Lao, Khmer).
 * Emergency wrapping relaxes alphabetic word protection only; punctuation,
 * non-breaking spaces and word joiners retain their Unicode constraints.
 * Layout may reuse a paragraph's UTF-16 grapheme ends across both profiles.
 */
export function getWordLineBreaks(
	text: string,
	emergency = false,
	graphemeEnds: readonly number[] = getGraphemeEndPositions(text),
): LineBreakOpportunity[] {
	const base = emergency ? emergencyRules : defaultRules;
	if (emergency || !Array.from(text).some(character => isComplexContext(character.codePointAt(0)!))) {
		return collectProtectedBreaks(base, text, graphemeEnds);
	}

	const boundaries = new Set(Array.from(getWordSegments(text), segment => segment.index));
	const rules = new Rules();
	rules.rules.splice(rules.rules.indexOf(LB28), 0, state => {
		return boundaries.has(state.cur.len) && isComplexContext(state.cur.cp) && isComplexContext(state.next.cp)
			? MAY_BREAK
			: PASS;
	});
	return collectProtectedBreaks(rules, text, graphemeEnds);
}

function collectProtectedBreaks(rules: Rules, text: string, graphemeEnds: readonly number[]): LineBreakOpportunity[] {
	const boundaries = new Set(graphemeEnds);
	return Array.from(rules.breaks(text), ({ position, required }) => ({ position, required })).filter(
		point => point.required || boundaries.has(point.position),
	);
}

function isComplexContext(codePoint: number): boolean {
	return codePoint >= 0 && LineBreak.get(codePoint) === LineBreakClasses.SA;
}
