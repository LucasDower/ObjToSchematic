import { RGBA, RGBAUtil } from "./colour";
import { clamp } from "./math";
import { TTexelExtension, TTexelInterpolation } from "./util/type_util";

export class OtS_Texture {
    private _data: Uint8ClampedArray;
    private _width: number;
    private _height: number;
    private _interpolation: TTexelInterpolation;
    private _extension: TTexelExtension;

    /**
     * Expects `data` to contain RGBA data, i.e. `width*height*4` elements.
     */
    public constructor(data: Uint8ClampedArray, width: number, height: number, interpolation: TTexelInterpolation, extension: TTexelExtension) {
        this._data = data;
        this._width = width;
        this._height = height;
        this._interpolation = interpolation;
        this._extension = extension;
    }

    public sample(u: number, v: number): RGBA {
        const sampleU = this._extension === 'clamp'
            ? this._clampValue(u)
            : this._repeatValue(u);

        const sampleV = this._extension === 'clamp'
            ? 1.0 - this._clampValue(v)
            : 1.0 - this._repeatValue(v);

        return this._interpolation === 'nearest'
            ? this._sampleNearest(sampleU, sampleV)
            : this._sampleLinear(sampleU, sampleV);
    }

    public getWidth() {
        return this._width;
    }

    public getHeight() {
        return this._height;
    }

    public getInterpolation() {
        return this._interpolation;
    }

    public getExtension() {
        return this._extension;
    }

    public getData() {
        return this._data.slice(0);
    }

    public copy() {
        return new OtS_Texture(
            this._data.slice(0),
            this._width,
            this._height,
            this._interpolation,
            this._extension,
        );
    }

    // Assumes `u` and `v` are in the range [0, 1]
    private _sampleLinear(u: number, v: number): RGBA {
        const x = Math.floor(u * (this._width - 1));
        const y = Math.floor(v * (this._height - 1));

        const left = Math.floor(x);
        const right = left + 1;

        const top = Math.floor(y);
        const bottom = top + 1;

        const AB = RGBAUtil.lerp(
            this._samplePixel(left, top),
            this._samplePixel(right, top),
            x - left,
        );

        const CD = RGBAUtil.lerp(
            this._samplePixel(left, bottom),
            this._samplePixel(right, bottom),
            x - left,
        );

        return RGBAUtil.lerp(AB, CD, y - top);
    }

    // Assumes `u` and `v` are in the range [0, 1]
    private _sampleNearest(u: number, v: number): RGBA {
        const x = Math.floor(u * (this._width - 1));
        const y = Math.floor(v * (this._height - 1));

        return this._samplePixel(x, y);
    }

    // Expects `x` and `y` to be integers
    private _samplePixel(x: number, y: number): RGBA {
        const cx = clamp(x, 0, this._width - 1);
        const cy = clamp(y, 0, this._height - 1);

        const index = 4 * (this._width * cy + cx);

        return {
            r: this._data[index + 0] / 255,
            g: this._data[index + 1] / 255,
            b: this._data[index + 2] / 255,
            a: this._data[index + 3] / 255,
        };
    }

    private _clampValue(x: number) {
        return clamp(x, 0.0, 1.0);
    }

    private _repeatValue(x: number) {
        if (Number.isInteger(x)) {
            return x > 0.5 ? 1.0 : 0.0;
        }
        const frac = Math.abs(x) - Math.floor(Math.abs(x));
        return x < 0.0 ? 1.0 - frac : frac;
    }

    public static CreateDebugTexture() {
        const data = Uint8ClampedArray.from([
            0,   0,   0,   255,
            255, 0,   255, 255,
            255, 0,   255, 255,
            0,   0,   0,   255,
        ]);

        return new OtS_Texture(data, 2, 2, 'nearest', 'repeat');
    }
}