import * as fs from 'fs';
import * as jpeg from 'jpeg-js';
import path from 'path';
import { PNG } from 'pngjs';
const TGA = require('tga');

import { RGBA, RGBAColours, RGBAUtil } from './colour';
import { AppConfig } from './config';
import { clamp, wayThrough } from './math';
import { UV } from './util';
import { AppError, ASSERT } from './util/error_util';
import { FileUtil } from './util/file_util';
import { LOG, LOG_ERROR, LOGF } from './util/log_util';
import { AppPaths } from './util/path_util';
import { TTexelExtension, TTexelInterpolation } from './util/type_util';

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

type ImageData = {
    data: Buffer,
    width: number,
    height: number
}

export class Texture {
    private _image: ImageData;
    private _alphaImage?: ImageData;

    constructor(filename: string, transparencyFilename?: string) {
        ASSERT(path.isAbsolute(filename));

        this._image = this._loadImageFile(filename);

        if (transparencyFilename) {
            this._alphaImage = this._loadImageFile(transparencyFilename);
        }
    }

    private _loadImageFile(filename: string): ImageData {
        ASSERT(path.isAbsolute(filename));
        const filePath = path.parse(filename);
        try {
            const data = fs.readFileSync(filename);

            switch (filePath.ext.toLowerCase()) {
                case '.png': {
                    return PNG.sync.read(data);
                }
                case '.jpg':
                case '.jpeg': {
                    this._useAlphaChannelValue = false;
                    return jpeg.decode(data, {
                        maxMemoryUsageInMB: AppConfig.Get.MAXIMUM_IMAGE_MEM_ALLOC,
                    });
                }
                /*
                case '.tga': {
                    const tga = new TGA(data);
                    return {
                        width: tga.width,
                        height: tga.height,
                        data: tga.pixels,
                    };
                }
                */
                default:
                    ASSERT(false, 'Unsupported image format');
            }
        } catch (err) {
            LOG_ERROR(err);
            throw new AppError(`Could not read ${filename}`);
        }
    }

    /**
     * UV can be in any range and is not limited to [0, 1]
     */
    public getRGBA(inUV: UV, interpolation: TTexelInterpolation, extension: TTexelExtension): RGBA {
        const uv = new UV(0.0, 0.0);

        if (extension === 'clamp') {
            uv.u = clamp(inUV.u, 0.0, 1.0);
            uv.v = clamp(inUV.v, 0.0, 1.0);
        } else {
            uv.u = Math.abs(inUV.u) - Math.floor(Math.abs(inUV.u));
            uv.v = Math.abs(inUV.v) - Math.floor(Math.abs(inUV.v));
        }
        ASSERT(uv.u >= 0.0 && uv.u <= 1.0, 'Texcoord UV.u OOB');
        ASSERT(uv.v >= 0.0 && uv.v <= 1.0, 'Texcoord UV.v OOB');
        uv.v = 1.0 - uv.v;

        if (interpolation === 'nearest') {
            return this._getNearestRGBA(uv);
        } else {
            return this._getLinearRGBA(uv);
        }
    }

    /**
     * UV is assumed to be in [0, 1] range.
     */
    private _getLinearRGBA(uv: UV): RGBA {
        const x = uv.u * this._image.width;
        const y = uv.v * this._image.height;

        const xLeft = Math.floor(x);
        const xRight = xLeft + 1;
        const yUp = Math.floor(y);
        const yDown = yUp + 1;

        const u = x - xLeft;
        const v = y - yUp;

        if (!(u >= 0.0 && u <= 1.0 && v >= 0.0 && v <= 1.0)) {
            return RGBAColours.MAGENTA;
        }

        const A = this._getFromXY(xLeft, yUp);
        const B = this._getFromXY(xRight, yUp);
        const AB = RGBAUtil.lerp(A, B, u);

        const C = this._getFromXY(xLeft, yDown);
        const D = this._getFromXY(xRight, yDown);
        const CD = RGBAUtil.lerp(C, D, u);

        return RGBAUtil.lerp(AB, CD, v);
    }

    /**
     * UV is assumed to be in [0, 1] range.
     */
    private _getNearestRGBA(uv: UV): RGBA {
        const x = Math.floor(uv.u * this._image.width);
        const y = Math.floor(uv.v * this._image.height);

        return this._getFromXY(x, y);
    }

    private _getFromXY(x: number, y: number): RGBA {
        const diffuse = Texture._sampleImage(this._image, x, y);

        if (this._alphaImage) {
            const alpha = Texture._sampleImage(this._alphaImage, x, y);
            return {
                r: diffuse.r,
                g: diffuse.g,
                b: diffuse.b,
                a: this._useAlphaChannel() ? alpha.a : alpha.r,
            };
        }

        return diffuse;
    }

    public _useAlphaChannelValue?: boolean;
    public _useAlphaChannel() {
        ASSERT(this._alphaImage !== undefined);
        if (this._useAlphaChannelValue !== undefined) {
            return this._useAlphaChannelValue;
        }

        for (let i = 0; i < this._alphaImage.width; ++i) {
            for (let j = 0; j < this._alphaImage.height; ++j) {
                const value = Texture._sampleImage(this._alphaImage, i, j);
                if (value.a != 1.0) {
                    LOG(`Using alpha channel`);
                    this._useAlphaChannelValue = true;
                    return true;
                }
            }
        }

        LOG(`Using red channel`);
        this._useAlphaChannelValue = false;
        return false;
    }

    private static _sampleImage(image: ImageData, x: number, y: number) {
        x = clamp(x, 0, image.width - 1);
        y = clamp(y, 0, image.height - 1);

        const index = 4 * (image.width * y + x);
        const rgba = image.data.slice(index, index + 4);

        return {
            r: rgba[0] / 255,
            g: rgba[1] / 255,
            b: rgba[2] / 255,
            a: rgba[3] / 255,
        };
    }
}

export class TextureConverter {
    public static createPNGfromTGA(filepath: string): string {
        ASSERT(fs.existsSync(filepath), '.tga does not exist');
        const parsed = path.parse(filepath);
        ASSERT(parsed.ext === '.tga');
        const data = fs.readFileSync(filepath);
        const tga = new TGA(data);
        const png = new PNG({
            width: tga.width,
            height: tga.height,
        });
        png.data = tga.pixels;
        FileUtil.mkdirIfNotExist(AppPaths.Get.gen);
        const buffer = PNG.sync.write(png);
        const newTexturePath = path.join(AppPaths.Get.gen, parsed.name + '.gen.png');
        LOGF(`Creating new generated texture of '${filepath}' at '${newTexturePath}'`);
        fs.writeFileSync(newTexturePath, buffer);
        return newTexturePath;
    }
}
