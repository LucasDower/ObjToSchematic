import { UV, ASSERT, AppError } from './util';

import * as fs from 'fs';
import * as jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import path from 'path';
import { clamp, wayThrough } from './math';
import { RGBA, RGBAColours, RGBAUtil } from './colour';

/* eslint-disable */
export enum TextureFormat {
    PNG,
    JPEG
}
/* eslint-enable */

/* eslint-disable */
export enum TextureFiltering {
    Linear,
    Nearest
}
/* eslint-enable */

export class Texture {
    private _image: {
        data: Buffer,
        width: number,
        height: number
    };

    constructor(filename: string) {
        ASSERT(path.isAbsolute(filename));
        const filePath = path.parse(filename);
        try {
            const data = fs.readFileSync(filename);
            if (filePath.ext.toLowerCase() === '.png') {
                this._image = PNG.sync.read(data);
            } else if (['.jpg', '.jpeg'].includes(filePath.ext.toLowerCase())) {
                this._image = jpeg.decode(data);
            } else {
                throw new AppError(`Failed to load ${filename}`);
            }
            if (this._image.width * this._image.height * 4 !== this._image.data.length) {
                throw new AppError(`Unexpected image resolution mismatch: ${filename}`);
            }
        } catch (err) {
            throw new AppError(`Could not read ${filename}`);
        }
    }

    public getRGBA(uv: UV, filtering: TextureFiltering): RGBA {
        if (filtering === TextureFiltering.Nearest) {
            return this._getNearestRGBA(uv);
        } else {
            return this._getLinearRGBA(uv);
        }
    }

    private _getLinearRGBA(uv: UV): RGBA {
        uv.v = 1.0 - uv.v;

        uv.u = uv.u % 1.0;
        uv.v = uv.v % 1.0;

        const x = uv.u * this._image.width;
        const y = uv.v * this._image.height;

        const xL = Math.floor(x);
        const xU = xL + 1;
        const yL = Math.floor(y);
        const yU = yL + 1;

        const u = wayThrough(x, xL, xU);
        const v = wayThrough(y, yL, yU);
        
        if (!(u >= 0.0 && u <= 1.0 && v >= 0.0 && v <= 1.0)) {
            return RGBAColours.MAGENTA;
        }

        const A = this._getFromXY(xL, yU);
        const B = this._getFromXY(xU, yU);
        const AB = RGBAUtil.lerp(A, B, u);
        
        const C = this._getFromXY(xL, yL);
        const D = this._getFromXY(xU, yL);
        const CD = RGBAUtil.lerp(C, D, u);

        return RGBAUtil.lerp(AB, CD, v);
    }

    private _getNearestRGBA(uv: UV): RGBA {
        const x = Math.floor(uv.u * this._image.width);
        const y = Math.floor((1 - uv.v) * this._image.height);

        return this._getFromXY(x, y);
    }

    private _getFromXY(x: number, y: number): RGBA {
        x = clamp(x, 0, this._image.width - 1);
        y = clamp(y, 0, this._image.height - 1);
        
        const index = 4 * (this._image.width * y + x);
        const rgba = this._image.data.slice(index, index + 4);

        return {
            r: rgba[0] / 255,
            g: rgba[1] / 255,
            b: rgba[2] / 255,
            a: rgba[3] / 255,
        };
    }
}
