import { OtS_Texture } from "src/runtime/ots_texture";
import { TTexelExtension, TTexelInterpolation } from "src/runtime/util/type_util";

export type OtSE_TextureFormat = 'png' | 'jpg';

export enum OtSE_ImageChannel {
    R = 0,
    G = 1,
    B = 2,
    A = 3,
    MAX = 4,
}

export type TImageRawWrap = {
    raw: string,
    filetype: OtSE_TextureFormat,
}

export type TTransparencyTypes = 'None' | 'UseDiffuseMapAlphaChannel' | 'UseAlphaValue' | 'UseAlphaMap';

export type TTransparencyOptions =
    | { type: 'None' }
    | { type: 'UseDiffuseMapAlphaChannel' }
    | { type: 'UseAlphaValue', alpha: number }
    | { type: 'UseAlphaMap', alpha?: TImageRawWrap, channel: OtSE_ImageChannel };

export class OtSE_TextureReader {
    public static CreateFromImage(source: string, filetype: OtSE_TextureFormat, interpolation: TTexelInterpolation, extension: TTexelExtension): OtS_Texture {
        throw 'Unimplemented';
    }
}