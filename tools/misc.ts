import { RGBA } from '../src/runtime/colour';

export function getAverageColour(image: Uint8ClampedArray): RGBA {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let weight = 0;
    for (let x = 0; x < 16; ++x) {
        for (let y = 0; y < 16; ++y) {
            const index = 4 * (16 * y + x);
            const rgba = image.slice(index, index + 4);
            const alpha = rgba[3] / 255;
            r += (rgba[0] / 255) * alpha;
            g += (rgba[1] / 255) * alpha;
            b += (rgba[2] / 255) * alpha;
            a += alpha;
            weight += alpha;
        }
    }
    const numPixels = 16 * 16;
    return {
        r: r / weight,
        g: g / weight,
        b: b / weight,
        a: a / numPixels,
    };
}

export function getStandardDeviation(image: Uint8ClampedArray, average: RGBA): number {
    let squaredDist = 0.0;
    let weight = 0.0;
    for (let x = 0; x < 16; ++x) {
        for (let y = 0; y < 16; ++y) {
            const index = 4 * (16 * y + x);
            const rgba = image.slice(index, index + 4);
            const alpha = rgba[3] / 255;
            weight += alpha;
            const r = (rgba[0] / 255) * alpha;
            const g = (rgba[1] / 255) * alpha;
            const b = (rgba[2] / 255) * alpha;
            squaredDist += Math.pow(r - average.r, 2) + Math.pow(g - average.g, 2) + Math.pow(b - average.b, 2);
        }
    }
    return Math.sqrt(squaredDist / weight);
}