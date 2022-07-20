import { AppConfig } from './config';
import { Vector3 } from './vector';
import { clamp } from './math';

import path from 'path';
import fs from 'fs';

export class UV {
    public u: number;
    public v: number;

    constructor(u: number, v: number) {
        this.u = u;
        this.v = v;
    }

    public copy() {
        return new UV(this.u, this.v);
    }
}

/* eslint-disable */
export enum ColourSpace {
    RGB,
    LAB
}
/* eslint-enable */

export type TOptional<T> = T | undefined;

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

    public getDimensions() {
        return Vector3.sub(this._max, this._min);
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
export const TIME_START = console.time;
export const TIME_END = console.timeEnd;
/* eslint-enable */

/** Regex for non-zero whitespace */
export const REGEX_NZ_WS = /[ \t]+/;

/** Regex for number */
export const REGEX_NUMBER = /[0-9eE+\.\-]+/;

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

export class AppError extends Error {
    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, AppError.prototype);
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

export const BASE_DIR = path.join(__dirname, '/../../');
export const RESOURCES_DIR = path.join(BASE_DIR, './res/');
export const ATLASES_DIR = path.join(RESOURCES_DIR, './atlases');
export const PALETTES_DIR = path.join(RESOURCES_DIR, './palettes/');
export const STATIC_DIR = path.join(RESOURCES_DIR, './static/');
export const SHADERS_DIR = path.join(RESOURCES_DIR, './shaders/');
export const TOOLS_DIR = path.join(BASE_DIR, './tools/');
export const TESTS_DATA_DIR = path.join(BASE_DIR, './tests/data/');

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
