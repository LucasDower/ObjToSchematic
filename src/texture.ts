import { UV, ASSERT, CustomError } from './util';
import { RGB } from './util';

import * as fs from 'fs';
import * as jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import path from 'path';

/* eslint-disable */
export enum TextureFormat {
    PNG,
    JPEG
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

    getRGB(uv: UV): RGB {
        const x = Math.floor(uv.u * this._image.width);
        const y = Math.floor((1 - uv.v) * this._image.height);

        const index = 4 * (this._image.width * y + x);
        const rgba = this._image.data.slice(index, index + 4);

        return new RGB(
            rgba[0] / 255,
            rgba[1] / 255,
            rgba[2] / 255,
        );
    }
}
