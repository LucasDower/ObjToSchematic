/**
 * u, v values are between 0.0 and 1.0, inclusive.
 */
export interface UV {
    u: number;
    v: number;
}

/**
 * r, g, b values are between 0.0 and 1.0, inclusive.
 */
export interface RGB {
    r: number,
    g: number,
    b: number
}

export function getAverageColour(colours: Array<RGB>) {
    let averageColour = colours.reduce((a, c) => { return { r: a.r + c.r, g: a.g + c.g, b: a.b + c.b } });
    let n = colours.length;
    averageColour.r /= n;
    averageColour.g /= n;
    averageColour.b /= n;
    return averageColour;
}

export function rgbToArray(rgb: RGB) {
    return [rgb.r, rgb.g, rgb.b];
}

/**
 * r, g, b, a values are between 0.0 and 1.0, inclusive.
 */
export interface RGBA {
    r: number,
    g: number,
    b: number,
    a: number
}

export interface Bounds {
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number,
}

export function assert(condition: boolean, errorMessage: string = "Assertion Failed") {
    if (!condition) {
        throw Error(errorMessage);
    }
}