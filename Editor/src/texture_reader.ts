import { decode as jpegDecode } from 'jpeg-js';
import { PNG } from 'pngjs';

import { OtS_Texture } from "../../Core/src/ots_texture";
import { TTexelExtension, TTexelInterpolation } from "../../Core/src/util/type_util";

export type OtSE_TextureFormat = 'png' | 'jpg';

export type TImageRawWrap = {
    raw: string,
    filetype: OtSE_TextureFormat,
}

export class OtSE_TextureReader {
    public static CreateFromImage(source: string, filetype: OtSE_TextureFormat, interpolation: TTexelInterpolation, extension: TTexelExtension): OtS_Texture {
        const buffer = Buffer.from(source.split(',')[1], 'base64');

        switch (filetype) {
            case 'jpg':
                const jpeg = jpegDecode(buffer, {
                    formatAsRGBA: true,
                    maxMemoryUsageInMB: undefined,
                });
                return new OtS_Texture(
                    Uint8ClampedArray.from(jpeg.data),
                    jpeg.width,
                    jpeg.height,
                    interpolation,
                    extension,
                );
            case 'png':
                const png = PNG.sync.read(buffer);
                return new OtS_Texture(
                    Uint8ClampedArray.from(png.data),
                    png.width,
                    png.height,
                    interpolation,
                    extension,
                );
        }
    }
}