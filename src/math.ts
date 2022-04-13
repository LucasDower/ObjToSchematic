import { AppError, LOG_ERROR } from './util';
import { Vector3 } from './vector';


export const argMax = (array: [number]) => {
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
};

export const fastCrossXAxis = (vec: Vector3) => {
    return new Vector3(0.0, -vec.z, vec.y);
};

export const fastCrossYAxis = (vec: Vector3) => {
    return new Vector3(vec.z, 0.0, -vec.x);
};

export const fastCrossZAxis = (vec: Vector3) => {
    return new Vector3(-vec.y, vec.x, 0.0);
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

export const wayThrough = (value: number, min: number, max: number) => {
    // ASSERT(value >= min && value <= max);
    return (value - min) / (max - min);
};

/**
 * Throws is any number in args is NaN
 */
export const checkNaN = (...args: number[]) => {
    const existsNaN = args.some((arg) => {
        return isNaN(arg);
    });
    if (existsNaN) {
        LOG_ERROR(args);
        throw new AppError('Found NaN');
    }
};

/**
 * Throws if any number in not within [0, 1]
 */
export const checkFractional = (...args: number[]) => {
    const existsOutside = args.some((arg) => {
        return arg > 1.0 || arg < 0.0;
    });
    if (existsOutside) {
        throw new AppError('Found value outside of [0, 1]');
    }
};

export const degreesToRadians = Math.PI / 180;
