import * as fs from 'fs';
import * as jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { UV, RGBA } from './util';

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

    constructor(filename: string, format: TextureFormat) {
        try {
            const data = fs.readFileSync(filename);
            if (format === TextureFormat.PNG) {
                this._image = PNG.sync.read(data);
            } else {
                this._image = jpeg.decode(data);
            }
            if (this._image.width * this._image.height * 4 !== this._image.data.length) {
                throw Error();
            }
        } catch (err) {
            throw Error(`Could not parse ${filename}`);
        }
    }

    getRGBA(uv: UV): RGBA {
        uv.v = 1 - uv.v;

        const x = Math.floor(uv.u * this._image.width);
        const y = Math.floor(uv.v * this._image.height);

        const index = 4 * (this._image.width * y + x);
        const rgba = this._image.data.slice(index, index + 4);

        return {
            r: rgba[0] / 255,
            g: rgba[1] / 255,
            b: rgba[2] / 255,
            a: 1.0,
        };
    }
}
