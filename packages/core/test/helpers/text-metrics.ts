/**
 * Width-only fixtures have no glyph ink or font extents.
 */
export function createTextMetrics(width: number): TextMetrics {
	return {
		width, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0,
		actualBoundingBoxLeft: 0, actualBoundingBoxRight: width,
		fontBoundingBoxAscent: 0, fontBoundingBoxDescent: 0,
		emHeightAscent: 0, emHeightDescent: 0,
		alphabeticBaseline: 0, hangingBaseline: 0, ideographicBaseline: 0,
	};
}
