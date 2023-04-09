import { ASSERT } from './util/error_util';
import { Vector3 } from './vector';

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
 * Throws is any number in args is NaN
 */
export const checkNaN = (...args: number[]) => {
    const existsNaN = args.some((arg) => {
        return isNaN(arg);
    });
    ASSERT(!existsNaN, 'Found NaN');
};

export const degreesToRadians = Math.PI / 180;

export class SmoothVariable {
    private _actual: number;
    private _target: number;
    private _smoothing: number;
    private _min: number;
    private _max: number;

    public constructor(value: number, smoothing: number) {
        this._actual = value;
        this._target = value;
        this._smoothing = smoothing;
        this._min = -Infinity;
        this._max = Infinity;
    }

    public setClamp(min: number, max: number) {
        this._min = min;
        this._max = max;
    }

    public addToTarget(delta: number) {
        this._target = clamp(this._target + delta, this._min, this._max);
    }

    public setTarget(target: number) {
        this._target = clamp(target, this._min, this._max);
    }

    public setActual(actual: number) {
        this._actual = actual;
    }

    public tick() {
        this._actual += (this._target - this._actual) * this._smoothing;
    }

    public getActual() {
        return this._actual;
    }

    public getTarget() {
        return this._target;
    }
}

export class SmoothVectorVariable {
    private _actual: Vector3;
    private _target: Vector3;
    private _smoothing: number;

    public constructor(value: Vector3, smoothing: number) {
        this._actual = value;
        this._target = value;
        this._smoothing = smoothing;
    }

    public addToTarget(delta: Vector3) {
        this._target = Vector3.add(this._target, delta);
    }

    public setTarget(target: Vector3) {
        this._target = target;
    }

    public tick() {
        this._actual.add(Vector3.sub(this._target, this._actual).mulScalar(this._smoothing));
    }

    public getActual() {
        return this._actual;
    }

    public getTarget() {
        return this._target;
    }
}
