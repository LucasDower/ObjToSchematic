import { AppConfig } from './config';
import { Vector3 } from './vector';
import { clamp } from './math';

const convert = require('color-convert');

import fs from 'fs';

export class UV {
    public u: number;
    public v: number;

    constructor(u: number, v: number) {
        this.u = u;
        this.v = v;
    }
}

/* eslint-disable */
export enum ColourSpace {
    RGB,
    LAB
}
/* eslint-enable */

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

    public static distance(a: RGB, b: RGB, colourSpace: ColourSpace): number {
        if (colourSpace === ColourSpace.LAB) {
            const aLAB = convert.rgb.lab(a.r * 255, a.g * 255, a.b * 255);
            const bLAB = convert.rgb.lab(b.r * 255, b.g * 255, b.b * 255);
            const _a = Vector3.fromArray(aLAB);
            const _b = Vector3.fromArray(bLAB);
            return _a.sub(_b).magnitude();
        } else {
            ASSERT(colourSpace === ColourSpace.RGB);
            const _a = a.toVector3();
            const _b = b.toVector3();
            return _a.sub(_b).magnitude();
        }
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

    public getCentre() {
        const extents = Vector3.sub(this._max, this._min).divScalar(2);
        return Vector3.add(this.min, extents);
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

/** Regex for non-zero whitespace */
export const REGEX_NZ_WS = /[ \t]+/;

/** Regex for number */
export const REGEX_NUMBER = /[0-9\.\-]+/;

export const REGEX_NZ_ANY = /.+/;

export function regexCapture(identifier: string, regex: RegExp) {
    return new RegExp(`(?<${identifier}>${regex.source}`);
}

export function regexOptional(regex: RegExp) {
    return new RegExp(`(${regex})?`);
}

export function buildRegex(...args: (string | RegExp)[]) {
    return new RegExp(args.map((r) => {
        if (r instanceof RegExp) {
            return r.source;
        }
        return r;
    }).join(''));
}

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

export class RegExpBuilder {
    private _components: string[];

    public constructor() {
        this._components = [];
    }

    public add(item: string | RegExp, capture?: string, optional: boolean = false): RegExpBuilder {
        let regex: string;
        if (item instanceof RegExp) {
            regex = item.source;
        } else {
            regex = item;
        }
        if (capture) {
            regex = `(?<${capture}>${regex})`;
        }
        if (optional) {
            regex = `(${regex})?`;
        }
        this._components.push(regex);
        return this;
    }

    public addMany(items: (string | RegExp)[], optional: boolean = false): RegExpBuilder {
        let toAdd: string = '';
        for (const item of items) {
            if (item instanceof RegExp) {
                toAdd += item.source;
            } else {
                toAdd += item;
            }
        }
        this._components.push(optional ? `(${toAdd})?` : toAdd);
        return this;
    }

    public addNonzeroWhitespace(): RegExpBuilder {
        this.add(REGEX_NZ_WS);
        return this;
    }

    public toRegExp(): RegExp {
        return new RegExp(this._components.join(''));
    }
}

export class Warnable {
    private _warnings: string[];

    constructor() {
        this._warnings = [];
    }

    public addWarning(warning: string) {
        this._warnings.push(warning);
    }

    public getWarnings() {
        return this._warnings;
    }
}

export function getRandomID(): string {
    return (Math.random() + 1).toString(36).substring(7);
}

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
