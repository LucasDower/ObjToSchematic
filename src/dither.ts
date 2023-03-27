import { RGBA_255 } from './colour';
import { AppConfig } from './config';
import { ASSERT } from './util/error_util';
import { Vector3 } from './vector';

export class Ditherer {
    public static ditherRandom(colour: RGBA_255, magnitude: number) {
        const offset = (Math.random() - 0.5) * magnitude;

        colour.r += offset;
        colour.g += offset;
        colour.b += offset;
    }

    public static ditherOrdered(colour: RGBA_255, position: Vector3, magnitude: number) {
        const map = this._getThresholdValue(
            Math.abs(position.x % 4),
            Math.abs(position.y % 4),
            Math.abs(position.z % 4),
        );

        const offset = map * magnitude;

        colour.r += offset;
        colour.g += offset;
        colour.b += offset;
    }

    private static _mapMatrix = [
        0, 16, 2, 18, 48, 32, 50, 34,
        6, 22, 4, 20, 54, 38, 52, 36,
        24, 40, 26, 42, 8, 56, 10, 58,
        30, 46, 28, 44, 14, 62, 12, 60,
        3, 19, 5, 21, 51, 35, 53, 37,
        1, 17, 7, 23, 49, 33, 55, 39,
        27, 43, 29, 45, 11, 59, 13, 61,
        25, 41, 31, 47, 9, 57, 15, 63,
    ];

    private static _getThresholdValue(x: number, y: number, z: number) {
        const size = 4;
        ASSERT(0 <= x && x < size && 0 <= y && y < size && 0 <= z && z < size);
        const index = (x + (size * y) + (size * size * z));
        ASSERT(0 <= index && index < size * size * size);
        return (Ditherer._mapMatrix[index] / (size * size * size)) - 0.5;
    }
}
