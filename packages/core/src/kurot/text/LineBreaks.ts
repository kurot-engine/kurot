import { LineBreak, LineBreakClasses, MAY_BREAK, PASS, Rules } from '@cto.af/linebreak';

export interface LineBreakOpportunity {
	position: number;
	required: boolean;
}

const defaultRules = new Rules();
const emergencyRules = new Rules();
emergencyRules.removeRule('LB28');

let wordSegmenter: Intl.Segmenter | undefined;

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
 */
export function getWordLineBreaks(text: string, emergency = false): LineBreakOpportunity[] {
	const base = emergency ? emergencyRules : defaultRules;
	if (emergency || !Array.from(text).some(character => isComplexContext(character.codePointAt(0)!))) {
		return Array.from(base.breaks(text), ({ position, required }) => ({ position, required }));
	}

	wordSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'word' });
	const boundaries = new Set(Array.from(wordSegmenter.segment(text), segment => segment.index));
	const rules = new Rules();
	rules.addRuleBefore('LB28', state => {
		return boundaries.has(state.cur.len) && isComplexContext(state.cur.cp) && isComplexContext(state.next.cp)
			? MAY_BREAK
			: PASS;
	});
	return Array.from(rules.breaks(text), ({ position, required }) => ({ position, required }));
}

function isComplexContext(codePoint: number): boolean {
	return codePoint >= 0 && LineBreak.get(codePoint) === LineBreakClasses.SA;
}
