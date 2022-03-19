import { UV, ASSERT, CustomError } from './util';
import { RGB } from './util';

import * as fs from 'fs';
import * as jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import path from 'path';
import { Vector3 } from './vector';
import { clamp, wayThrough } from './math';

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
                throw new CustomError(`Failed to load: ${filename}`);
            }
            if (this._image.width * this._image.height * 4 !== this._image.data.length) {
                throw new CustomError(`Unexpected image resolution mismatch: ${filename}`);
            }
        } catch (err) {
            throw new CustomError(`Could not read ${filename}`);
        }
    }

    getRGB(uv: UV, filtering: TextureFiltering): RGB {
        if (filtering === TextureFiltering.Nearest) {
            return this._getNearestRGB(uv);
        } else {
            return this._getLinearRGB(uv);
        }
    }

    private _getLinearRGB(uv: UV): RGB {
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
        ASSERT(u >= 0.0 && u <= 1.0 && v >= 0.0 && v <= 1.0, `UV out of range (${u}, ${v})`);

        const A = this._getFromXY(xL, yU).toVector3();
        const B = this._getFromXY(xU, yU).toVector3();
        const midAB = Vector3.mulScalar(B, u).add(Vector3.mulScalar(A, 1.0-u));
        
        const C = this._getFromXY(xL, yL).toVector3();
        const D = this._getFromXY(xU, yL).toVector3();
        const midCD = Vector3.mulScalar(D, u).add(Vector3.mulScalar(C, 1.0-u));

        const mid = Vector3.mulScalar(midAB, v).add(Vector3.mulScalar(midCD, 1.0-v));
        return RGB.fromVector3(mid);
    }

    private _getNearestRGB(uv: UV): RGB {
        const x = Math.floor(uv.u * this._image.width);
        const y = Math.floor((1 - uv.v) * this._image.height);

        return this._getFromXY(x, y);
    }

    private _getFromXY(x: number, y: number): RGB {
        x = clamp(x, 0, this._image.width - 1);
        y = clamp(y, 0, this._image.height - 1);
        
        const index = 4 * (this._image.width * y + x);
        const rgba = this._image.data.slice(index, index + 4);

        return new RGB(
            rgba[0] / 255,
            rgba[1] / 255,
            rgba[2] / 255,
        );
    }
}
