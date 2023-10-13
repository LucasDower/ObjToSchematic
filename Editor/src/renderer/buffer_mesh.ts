import { OtS_Mesh } from 'ots-core/src/ots_mesh';
import { RGBA } from 'ots-core/src/colour';
import { OtS_Texture } from 'ots-core/src/ots_texture';

export type OtS_MeshBuffer = {
    name: string,
    data: {
    position: { numComponents: 3, data: Float32Array },
    normal: { numComponents: 3, data: Float32Array },
    indices: { numComponents: 3, data: Uint32Array },
    }
    numElements: number,
} & (
    | { type: 'solid', colour: RGBA }
    | { type: 'colour', data: { colour: { numComponents: 4, data: Float32Array } } }
    | { type: 'textured', texture: OtS_Texture, data: { texcoord: { numComponents: 2, data: Float32Array } } }
);

export class BufferGenerator {
    public static fromMesh(mesh: OtS_Mesh): OtS_MeshBuffer[] {
        const buffers: OtS_MeshBuffer[] = [];

        mesh.getSectionData().forEach((section) => {
            switch (section.type) {
                case 'solid': {
                    buffers.push({
                        type: 'solid',
                        name: section.name,
                        data: {
                            position: { numComponents: 3, data: section.positionData },
                            normal: { numComponents: 3, data: section.normalData },
                            indices: { numComponents: 3, data: section.indexData },
                        },
                        colour: section.colour,
                        numElements: section.indexData.length,
                    });
                    break;
                }
                case 'colour': {
                    buffers.push({
                        type: 'colour',
                        name: section.name,
                        data: {
                            position: { numComponents: 3, data: section.positionData },
                            normal: { numComponents: 3, data: section.normalData },
                            colour: { numComponents: 4, data: section.colourData },
                            indices: { numComponents: 3, data: section.indexData },
                        },
                        numElements: section.indexData.length,
                    });
                    break;
                }
                case 'textured': {
                    buffers.push({
                        type: 'textured',
                        name: section.name,
                        data: {
                            position: { numComponents: 3, data: section.positionData },
                            normal: { numComponents: 3, data: section.normalData },
                            texcoord: { numComponents: 2, data: section.texcoordData },
                            indices: { numComponents: 3, data: section.indexData },
                        },
                        texture: section.texture,
                        numElements: section.indexData.length,
                    });
                }
            }
        });

        return buffers;
    }
}
