import { AppConfig } from './config';

export type RGBA = {
    r: number,
    g: number,
    b: number,
    a: number
}

export namespace RGBAUtil {
    export function lerp(a: RGBA, b: RGBA, alpha: number) {
        return {
            r: a.r * (1 - alpha) + b.r * alpha,
            g: a.g * (1 - alpha) + b.g * alpha,
            b: a.b * (1 - alpha) + b.b * alpha,
            a: a.a * (1 - alpha) + b.a * alpha,
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
        squaredDistance += (a.a - b.a) * (a.a - b.a) * AppConfig.Get.ALPHA_BIAS;
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

    export function toArray(a: RGBA): number[] {
        return [a.r, a.g, a.b, a.a];
    }
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
