export namespace AppMath {
    export const RADIANS_0 = degreesToRadians(0.0);
    export const RADIANS_90 = degreesToRadians(90.0);
    export const RADIANS_180 = degreesToRadians(180.0);
    export const RADIANS_270 = degreesToRadians(270.0);

    export function lerp(value: number, start: number, end: number) {
        return (1 - value) * start + value * end;
    }

    export function nearlyEqual(a: number, b: number, tolerance: number = 0.0001) {
        return Math.abs(a - b) < tolerance;
    }

    export function degreesToRadians(degrees: number) {
        return degrees * (Math.PI / 180.0);
    }

    /**
     * Converts a float in [0, 1] to an int in [0, 255]
     * @param decimal A number in [0, 1]
     */
    export function uint8(decimal: number) {
        return Math.floor(decimal * 255);
    }

    export function largestPowerOfTwoLessThanN(n: number) {
        return Math.floor(Math.log2(n));
    }
}

export const argMax = (array: [number]) => {
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
};

export const clamp = (value: number, min: number, max: number) => {
    return Math.max(Math.min(max, value), min);
};

export const floorToNearest = (value: number, base: number) => {
    return Math.floor(value / base) * base;
};

export const ceilToNearest = (value: number, base: number) => {
    return Math.ceil(value / base) * base;
};

export const roundToNearest = (value: number, base: number) => {
    return Math.round(value / base) * base;
};

export const between = (value: number, min: number, max: number) => {
    return min <= value && value <= max;
};

export const mapRange = (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number) => {
    return (value - fromMin) / (fromMax - fromMin) * (toMax - toMin) + toMin;
};

export const wayThrough = (value: number, min: number, max: number) => {
    // ASSERT(value >= min && value <= max);
    return (value - min) / (max - min);
};

/**
 * Returs true if any number in args is NaN
 */
export const anyNaN = (...args: number[]) => {
    return args.some((arg) => {
        return isNaN(arg);
    });
};

export const degreesToRadians = Math.PI / 180;


