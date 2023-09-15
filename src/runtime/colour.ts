import { TBrand } from './util/type_util';

const hsv_rgb = require('hsv-rgb');

export type RGBA = {
    r: number,
    g: number,
    b: number,
    a: number
}

export type RGBA_255 = TBrand<RGBA, '255'>;

export namespace RGBAUtil {
    export function toString(a: RGBA) {
        return `(${a.r}, ${a.g}, ${a.b}, ${a.a})`;
    }

    export function randomPretty(): RGBA {
        const hue = Math.random() * 360;
        const sat = 65;
        const val = 85;

        const rgb: number[] = hsv_rgb(hue, sat, val);

        return {
            r: rgb[0] / 255,
            g: rgb[1] / 255,
            b: rgb[2] / 255,
            a: 1.0,
        }
    }

    export function random(): RGBA {
        return {
            r: Math.random(),
            g: Math.random(),
            b: Math.random(),
            a: 1.0,
        };
    }

    export function toHexString(a: RGBA) {
        const r = Math.floor(255 * a.r).toString(16).padStart(2, '0');
        const g = Math.floor(255 * a.g).toString(16).padStart(2, '0');
        const b = Math.floor(255 * a.b).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    export function fromHexString(str: string) {
        return {
            r: parseInt(str.substring(1, 3), 16) / 255,
            g: parseInt(str.substring(3, 5), 16) / 255,
            b: parseInt(str.substring(5, 7), 16) / 255,
            a: 1.0,
        };
    }

    export function toUint8String(a: RGBA) {
        return `(${Math.floor(255 * a.r)}, ${Math.floor(255 * a.g)}, ${Math.floor(255 * a.b)}, ${Math.floor(255 * a.a)})`;
    }

    export function toRGBA255(c: RGBA): RGBA_255 {
        const out: RGBA = {
            r: c.r * 255,
            g: c.r * 255,
            b: c.r * 255,
            a: c.r * 255,
        };
        return out as RGBA_255;
    }

    export function fromRGBA255(c: RGBA_255): RGBA {
        const out: RGBA = {
            r: c.r / 255,
            g: c.g / 255,
            b: c.b / 255,
            a: c.a / 255,
        };
        return out;
    }

    export function add(a: RGBA, b: RGBA) {
        a.r += b.r;
        a.g += b.g;
        a.b += b.b;
        a.a += b.a;
    }

    export function lerp(a: RGBA, b: RGBA, alpha: number) {
        const invAlpha = 1 - alpha;
        return {
            r: a.r * invAlpha + b.r * alpha,
            g: a.g * invAlpha + b.g * alpha,
            b: a.b * invAlpha + b.b * alpha,
            a: a.a * invAlpha + b.a * alpha,
        };
    }

    /**
     * Note this is a very naive approach to averaging a colour
     */
    export function average(...colours: RGBA[]) {
        const avg = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 };
        for (let i = 0; i < colours.length; ++i) {
            avg.r += colours[i].r;
            avg.g += colours[i].g;
            avg.b += colours[i].b;
            avg.a += colours[i].a;
        }
        avg.r /= colours.length;
        avg.g /= colours.length;
        avg.b /= colours.length;
        avg.a /= colours.length;
        return avg;
    }

    export function squaredDistance(a: RGBA, b: RGBA) {
        let squaredDistance = 0.0;
        squaredDistance += (a.r - b.r) * (a.r - b.r);
        squaredDistance += (a.g - b.g) * (a.g - b.g);
        squaredDistance += (a.b - b.b) * (a.b - b.b);
        squaredDistance += (a.a - b.a) * (a.a - b.a); // * AppConfig.Get.ALPHA_BIAS; TODO: ConfigRework
        return squaredDistance;
    }

    export function copy(a: RGBA): RGBA {
        return {
            r: a.r,
            g: a.g,
            b: a.b,
            a: a.a,
        };
    }

    export function copy255(a: RGBA_255): RGBA_255 {
        return {
            r: a.r,
            g: a.g,
            b: a.b,
            a: a.a,
        } as RGBA_255;
    }

    export function toArray(a: RGBA): number[] {
        return [a.r, a.g, a.b, a.a];
    }

    export function bin(col: RGBA, resolution: TColourAccuracy) {
        const binnedColour: RGBA = {
            r: Math.floor(Math.floor(col.r * resolution) * (255 / resolution)),
            g: Math.floor(Math.floor(col.g * resolution) * (255 / resolution)),
            b: Math.floor(Math.floor(col.b * resolution) * (255 / resolution)),
            a: Math.floor(Math.ceil(col.a * resolution) * (255 / resolution)),
        };

        return binnedColour as RGBA_255;
    }

    /**
     * Encodes a colour as a single number.
     * Note this will bin colours together.
     * @param col The colour to hash.
     * @param resolution An uint8, the larger the more accurate the hash.
     */
    export function hash(col: RGBA, resolution: TColourAccuracy): number {
        const r = Math.floor(col.r * resolution);
        const g = Math.floor(col.g * resolution);
        const b = Math.floor(col.b * resolution);
        const a = Math.floor(col.a * resolution);

        let hash = r;
        hash = (hash << 8) + g;
        hash = (hash << 8) + b;
        hash = (hash << 8) + a;
        return hash;
    }

    export function hash255(col: RGBA_255) {
        let hash = col.r;
        hash = (hash << 8) + col.g;
        hash = (hash << 8) + col.b;
        hash = (hash << 8) + col.a;
        return hash;
    }

    export type TColourAccuracy = number;
}

export namespace RGBAColours {
    export const RED: RGBA = { r: 1.0, g: 0.0, b: 0.0, a: 1.0 };
    export const GREEN: RGBA = { r: 0.0, g: 1.0, b: 0.0, a: 1.0 };
    export const BLUE: RGBA = { r: 0.0, g: 0.0, b: 1.0, a: 1.0 };

    export const YELLOW: RGBA = { r: 1.0, g: 1.0, b: 0.0, a: 1.0 };
    export const CYAN: RGBA = { r: 0.0, g: 1.0, b: 1.0, a: 1.0 };
    export const MAGENTA: RGBA = { r: 1.0, g: 0.0, b: 1.0, a: 1.0 };

    export const WHITE: RGBA = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };
    export const BLACK: RGBA = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };
}
