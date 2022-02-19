import { AppConfig } from './config';
import { Vector3 } from './vector';

import fs from 'fs';

export class UV {
    public u: number;
    public v: number;

    constructor(u: number, v: number) {
        this.u = u;
        this.v = v;
    }
}
export class RGB {
    public r: number;
    public g: number;
    public b: number;

    constructor(r: number, g: number, b: number) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    // Note: Uses naive sRGB Euclidian distance
    public static averageFrom(colours: RGB[]): RGB {
        let r = 0.0;
        let g = 0.0;
        let b = 0.0;
        for (const colour of colours) {
            r += colour.r;
            g += colour.g;
            b += colour.b;
        }
        const n = colours.length;
        return new RGB(r / n, g / n, b / n);
    }

    public static fromArray(array: number[]): RGB {
        ASSERT(array.length === 3);
        return new RGB(array[0], array[1], array[2]);
    }

    public toArray(): number[] {
        return [this.r, this.g, this.b];
    }

    public static distance(a: RGB, b: RGB): number {
        const _a = a.toVector3();
        const _b = b.toVector3();
        return _a.sub(_b).magnitude();
    }

    public static get white(): RGB {
        return new RGB(1.0, 1.0, 1.0);
    }

    public static get black(): RGB {
        return new RGB(0.0, 0.0, 0.0);
    }

    public static fromVector3(vec: Vector3): RGB {
        return new RGB(vec.x, vec.y, vec.z);
    }

    public toVector3(): Vector3 {
        return new Vector3(this.r, this.g, this.b);
    }
}

/**
 * A 3D cuboid volume defined by two opposing corners
 */
export class Bounds {
    private _min: Vector3;
    private _max: Vector3;

    constructor(min: Vector3, max: Vector3) {
        this._min = min;
        this._max = max;
    }

    public extendByPoint(point: Vector3) {
        this._min = Vector3.min(this._min, point);
        this._max = Vector3.max(this._max, point);
    }

    public extendByVolume(volume: Bounds) {
        this._min = Vector3.min(this._min, volume._min);
        this._max = Vector3.max(this._max, volume._max);
    }

    public static getInfiniteBounds() {
        return new Bounds(
            new Vector3(Infinity, Infinity, Infinity),
            new Vector3(-Infinity, -Infinity, -Infinity),
        );
    }

    public get min() {
        return this._min;
    }

    public get max() {
        return this._max;
    }
}

export function ASSERT(condition: any, errorMessage = 'Assertion Failed'): asserts condition {
    if (AppConfig.ASSERTIONS_ENABLED && !condition) {
        throw Error(errorMessage);
    }
}

/* eslint-disable */
export const LOG = console.log;
export const LOG_WARN = console.warn;
export const LOG_ERROR = console.error;

/* eslint-enable */

export class CustomError extends Error {
    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, CustomError.prototype);
    }
}

export class CustomWarning extends Error {
    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, CustomWarning.prototype);
    }
}

export function fileExists(absolutePath: string) {
    return fs.existsSync(absolutePath);
}
