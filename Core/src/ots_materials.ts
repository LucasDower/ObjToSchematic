import { RGBA, RGBAUtil } from "./util/colour";
import { OtS_Texture } from "./ots_texture";

export type OtS_MeshSection = { name: string, positionData: Float32Array, normalData: Float32Array, indexData: Uint32Array } & (
    | { type: 'solid', colour: RGBA }
    | { type: 'colour', colourData: Float32Array }
    | { type: 'textured', texcoordData: Float32Array, texture: OtS_Texture });

export namespace OtS_MeshUtil {
    export function copySection(section: OtS_MeshSection): OtS_MeshSection {
        switch(section.type) {
            case 'solid':
                return {
                    type: 'solid',
                    name: section.name,
                    indexData: section.indexData.slice(0),
                    positionData: section.positionData.slice(0),
                    normalData: section.normalData.slice(0),
                    colour: RGBAUtil.copy(section.colour),
                };
            case 'colour':
                return {
                    type: 'colour',
                    name: section.name,
                    indexData: section.indexData.slice(0),
                    positionData: section.positionData.slice(0),
                    normalData: section.normalData.slice(0),
                    colourData: section.colourData.slice(0),
                };
            case 'textured':
                return {
                    type: 'textured',
                    name: section.name,
                    indexData: section.indexData.slice(0),
                    positionData: section.positionData.slice(0),
                    normalData: section.normalData.slice(0),
                    texcoordData: section.texcoordData.slice(0),
                    texture: section.texture.copy(),
                };
        }
    }
}