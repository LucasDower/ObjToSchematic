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