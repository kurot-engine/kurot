const DEG_TO_RAD = Math.PI / 180;

const sinMap = new Float64Array(360);
const cosMap = new Float64Array(360);

for (let i = 0; i < 360; i++) {
	sinMap[i] = Math.sin(i * DEG_TO_RAD);
	cosMap[i] = Math.cos(i * DEG_TO_RAD);
}

// Fix floating-point imprecision for cardinal angles
sinMap[90] = 1;
cosMap[90] = 0;
sinMap[180] = 0;
cosMap[180] = -1;
sinMap[270] = -1;
cosMap[270] = 0;

export class NumberUtils {
	/**
	 * Returns approximate sin for the given angle in degrees, using a lookup table with linear interpolation.
	 */
	public static sin(value: number): number {
		const floor = Math.floor(value);
		const floorResult = NumberUtils.sinInt(floor);
		if (floor === value) return floorResult;
		return (value - floor) * NumberUtils.sinInt(floor + 1) + (floor + 1 - value) * floorResult;
	}

	/**
	 * Returns approximate cos for the given angle in degrees, using a lookup table with linear interpolation.
	 */
	public static cos(value: number): number {
		const floor = Math.floor(value);
		const floorResult = NumberUtils.cosInt(floor);
		if (floor === value) return floorResult;
		return (value - floor) * NumberUtils.cosInt(floor + 1) + (floor + 1 - value) * floorResult;
	}

	public static isNumber(value: unknown): value is number {
		return typeof value === 'number' && !isNaN(value);
	}

	public static convertStringToHashCode(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = (hash << 5) - hash + str.charCodeAt(i);
			hash |= 0;
		}
		return hash;
	}

	private static sinInt(value: number): number {
		value = value % 360;
		if (value < 0) value += 360;
		return sinMap[value];
	}

	private static cosInt(value: number): number {
		value = value % 360;
		if (value < 0) value += 360;
		return cosMap[value];
	}
}
