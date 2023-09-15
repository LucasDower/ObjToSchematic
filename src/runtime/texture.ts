import * as jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

import { RGBA, RGBAColours, RGBAUtil } from '../runtime/colour';
import { clamp } from './math';
import { TOptional, UV } from './util';
import { ASSERT } from './util/error_util';
import { LOG } from './util/log_util';
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

/* eslint-disable */
export enum EImageChannel {
    R = 0,
    G = 1,
    B = 2,
    A = 3,
    MAX = 4,
}
/* eslint-enable */

export type TImageFiletype = 'png' | 'jpg';

export type TImageRawWrap = {
    raw: string,
    filetype: TImageFiletype,
}

export type TTransparencyTypes = 'None' | 'UseDiffuseMapAlphaChannel' | 'UseAlphaValue' | 'UseAlphaMap';

export type TTransparencyOptions =
    | { type: 'None' }
    | { type: 'UseDiffuseMapAlphaChannel' }
    | { type: 'UseAlphaValue', alpha: number }
    | { type: 'UseAlphaMap', alpha?: TImageRawWrap, channel: EImageChannel };

export class Texture {
    private _image?: ImageData;
    private _alphaImage?: ImageData;

    constructor(params: { diffuse?: TImageRawWrap, transparency: TTransparencyOptions }) {
        this._image = this._readRawData(params.diffuse);

        this._alphaImage = params.transparency.type === 'UseAlphaMap' ?
            this._readRawData(params.transparency.alpha) :
            this._image;
    }

    private _readRawData(params?: TImageRawWrap): TOptional<ImageData> {
        if (params?.filetype === 'png') {
            const png = params.raw.split(',')[1];
            if (png !== undefined) {
                return PNG.sync.read(Buffer.from(png, 'base64'));
            }
        }
        if (params?.filetype === 'jpg') {
            const jpg = params.raw.split(',')[1];
            if (jpg !== undefined) {
                return jpeg.decode(Buffer.from(jpg, 'base64'), {
                    maxMemoryUsageInMB: 2048, //AppConfig.Get.MAXIMUM_IMAGE_MEM_ALLOC,
                    formatAsRGBA: true,
                });
            }
        }
    }

    private _correctTexcoord(a: number) {
        if (Number.isInteger(a)) {
            return a > 0.5 ? 1.0 : 0.0;
        }
        const frac = Math.abs(a) - Math.floor(Math.abs(a));
        return a < 0.0 ? 1.0 - frac : frac;
    }

    /**
     * UV can be in any range and is not limited to [0, 1]
     */
    public getRGBA(inUV: UV, interpolation: TTexelInterpolation, extension: TTexelExtension): RGBA {
        const uv = { u: 0.0, v: 0.0 };

        if (extension === 'clamp') {
            uv.u = clamp(inUV.u, 0.0, 1.0);
            uv.v = clamp(inUV.v, 0.0, 1.0);
        } else {
            uv.u = this._correctTexcoord(inUV.u);
            uv.v = this._correctTexcoord(inUV.v);
        }
        ASSERT(uv.u >= 0.0 && uv.u <= 1.0, 'Texcoord UV.u OOB');
        ASSERT(uv.v >= 0.0 && uv.v <= 1.0, 'Texcoord UV.v OOB');
        uv.v = 1.0 - uv.v;

        const diffuse = this._image === undefined ? RGBAColours.MAGENTA : ((interpolation === 'nearest') ?
            this._getNearestRGBA(this._image, uv) :
            this._getLinearRGBA(this._image, uv));

        const alpha = this._alphaImage === undefined ? RGBAColours.MAGENTA : ((interpolation === 'nearest') ?
            this._getNearestRGBA(this._alphaImage, uv) :
            this._getLinearRGBA(this._alphaImage, uv));

        return {
            r: diffuse.r,
            g: diffuse.g,
            b: diffuse.b,
            a: alpha.a,
        };
    }

    /**
     * UV is assumed to be in [0, 1] range.
     */
    private _getLinearRGBA(image: ImageData, uv: UV): RGBA {
        const x = uv.u * image.width;
        const y = uv.v * image.height;

        const xLeft = Math.floor(x);
        const xRight = xLeft + 1;
        const yUp = Math.floor(y);
        const yDown = yUp + 1;

        const u = x - xLeft;
        const v = y - yUp;

        if (!(u >= 0.0 && u <= 1.0 && v >= 0.0 && v <= 1.0)) {
            return RGBAColours.MAGENTA;
        }

        const top = Texture._sampleImagePair(xLeft, yUp, image);
        //const A = Texture._sampleImage(xLeft, yUp, image);
        //const B = Texture._sampleImage(xRight, yUp, image);
        const AB = RGBAUtil.lerp(top.left, top.right, u);

        const bottom = Texture._sampleImagePair(xLeft, yDown, image);
        //const C = Texture._sampleImage(xLeft, yDown, image);
        //const D = Texture._sampleImage(xRight, yDown, image);
        const CD = RGBAUtil.lerp(bottom.left, bottom.right, u);

        return RGBAUtil.lerp(AB, CD, v);
    }

    /**
     * UV is assumed to be in [0, 1] range.
     */
    private _getNearestRGBA(image: ImageData, uv: UV): RGBA {
        const diffuseX = Math.floor(uv.u * image.width);
        const diffuseY = Math.floor(uv.v * image.height);

        return Texture._sampleImage(diffuseX, diffuseY, image);
    }

    private _sampleChannel(colour: RGBA, channel: EImageChannel) {
        switch (channel) {
            case EImageChannel.R: return colour.r;
            case EImageChannel.G: return colour.g;
            case EImageChannel.B: return colour.b;
            case EImageChannel.A: return colour.a;
        }
    }

    public _useAlphaChannelValue?: boolean;
    public _useAlphaChannel() {
        ASSERT(this._alphaImage !== undefined);
        if (this._useAlphaChannelValue !== undefined) {
            return this._useAlphaChannelValue;
        }

        for (let i = 0; i < this._alphaImage.width; ++i) {
            for (let j = 0; j < this._alphaImage.height; ++j) {
                const value = Texture._sampleImage(i, j, this._alphaImage);
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

    private static _sampleImage(x: number, y: number, image: ImageData) {
        const cx = clamp(x, 0, image.width - 1);
        const cy = clamp(y, 0, image.height - 1);

        const index = 4 * (image.width * cy + cx);

        return {
            r: image.data[index + 0] / 255,
            g: image.data[index + 1] / 255,
            b: image.data[index + 2] / 255,
            a: image.data[index + 3] / 255,
        };
    }

    private static _sampleImagePair(x: number, y: number, image: ImageData) {
        const cx1 = clamp(x, 0, image.width - 1);
        const cx2 = clamp(x + 1, 0, image.width - 1);
        const cy = clamp(y, 0, image.height - 1);

        const index1 = 4 * (image.width * cy + cx1);
        const index2 = 4 * (image.width * cy + cx2);

        return {
            left: {
                r: image.data[index1 + 0] / 255,
                g: image.data[index1 + 1] / 255,
                b: image.data[index1 + 2] / 255,
                a: image.data[index1 + 3] / 255,
            },
            right: {
                r: image.data[index2 + 0] / 255,
                g: image.data[index2 + 1] / 255,
                b: image.data[index2 + 2] / 255,
                a: image.data[index2 + 3] / 255,
            }
        };
    }
}

export class TextureConverter {
    public static createPNGfromTGA(filepath: string): string {
        // TODO Unimplemented;
        return '';
        /*
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
        */
    }
}
