import { BlockMesh } from '../runtime/block_mesh';
import { AppConfig } from './config';
import { AppConstants } from '../runtime/constants';
import { GeometryTemplates } from '../runtime/geometry';
import { Mesh, SolidMaterial, TexturedMaterial } from '../runtime/mesh';
import { OcclusionManager } from '../runtime/occlusion';
import { ProgressManager } from './progress';
import { AttributeData } from './renderer/render_buffer';
import { AppUtil } from '../runtime/util';
import { ASSERT } from '../runtime/util/error_util';
import { Vector3 } from '../runtime/vector';
import { VoxelMesh } from '../runtime/voxel_mesh';
import { RenderNextVoxelMeshChunkParams } from './worker/worker_types';

export type TMeshBuffer = {
    position: { numComponents: 3, data: Float32Array },
    texcoord: { numComponents: 2, data: Float32Array },
    normal: { numComponents: 3, data: Float32Array },
    indices: { numComponents: 3, data: Uint32Array },
};

export type TMeshBufferDescription = {
    material: SolidMaterial | (TexturedMaterial)
    buffer: TMeshBuffer,
    numElements: number,
    materialName: string,
};

export type TVoxelMeshBuffer = {
    position: { numComponents: 3, data: Float32Array, },
    colour: { numComponents: 4, data: Float32Array },
    occlusion: { numComponents: 4, data: Float32Array },
    texcoord: { numComponents: 2, data: Float32Array },
    normal: { numComponents: 3, data: Float32Array },
    indices: { numComponents: 3, data: Uint32Array },
};

export type TVoxelMeshBufferDescription = {
    buffer: TVoxelMeshBuffer,
    numElements: number,
}

export type TBlockMeshBuffer = {
    position: { numComponents: 3, data: Float32Array, },
    colour: { numComponents: 4, data: Float32Array },
    occlusion: { numComponents: 4, data: Float32Array },
    texcoord: { numComponents: 2, data: Float32Array },
    normal: { numComponents: 3, data: Float32Array },
    blockTexcoord: { numComponents: 2, data: Float32Array },
    blockPosition: { numComponents: 3, data: Float32Array, },
    lighting: { numComponents: 1, data: Float32Array },
    indices: { numComponents: 3, data: Uint32Array },
};

export type TBlockMeshBufferDescription = {
    buffer: TBlockMeshBuffer,
    numElements: number,
}

type TMaterialID = string;

export class BufferGenerator {
    public static fromMesh(mesh: Mesh): TMeshBufferDescription[] {
        const numTris = mesh.getTriangleCount();

        // Count the number of triangles that use each material
        const materialTriangleCount = new Map<TMaterialID, number>();
        {
            for (let triIndex = 0; triIndex < numTris; ++triIndex) {
                const materialName = mesh.getMaterialByTriangle(triIndex);
                const triangleCount = materialTriangleCount.get(materialName) ?? 0;
                materialTriangleCount.set(materialName, triangleCount + 1);
            }
        }

        const materialBuffers: TMeshBufferDescription[] = [];

        let trianglesHandled = 0;
        const taskHandle = ProgressManager.Get.start('MeshBuffer');

        // Create the buffers for each material and fill with data from the triangles
        materialTriangleCount.forEach((triangleCount: number, materialName: string) => {
            const materialBuffer: TMeshBuffer = BufferGenerator.createMaterialBuffer(triangleCount);

            let insertIndex = 0;
            for (let triIndex = 0; triIndex < numTris; ++triIndex) {
                ProgressManager.Get.progress(taskHandle, trianglesHandled / numTris);

                const material = mesh.getMaterialByTriangle(triIndex);
                if (material === materialName) {
                    ++trianglesHandled;

                    const uiTriangle = mesh.getUVTriangle(triIndex);

                    // Position
                    {
                        materialBuffer.position.data.set(uiTriangle.v0.toArray(), insertIndex * 9 + 0);
                        materialBuffer.position.data.set(uiTriangle.v1.toArray(), insertIndex * 9 + 3);
                        materialBuffer.position.data.set(uiTriangle.v2.toArray(), insertIndex * 9 + 6);
                    }

                    // Texcoord
                    {
                        materialBuffer.texcoord.data.set([uiTriangle.uv0.u, uiTriangle.uv0.v], insertIndex * 6 + 0);
                        materialBuffer.texcoord.data.set([uiTriangle.uv1.u, uiTriangle.uv1.v], insertIndex * 6 + 2);
                        materialBuffer.texcoord.data.set([uiTriangle.uv2.u, uiTriangle.uv2.v], insertIndex * 6 + 4);
                    }

                    // Normal
                    {
                        materialBuffer.normal.data.set(uiTriangle.n0.toArray(), insertIndex * 9 + 0);
                        materialBuffer.normal.data.set(uiTriangle.n1.toArray(), insertIndex * 9 + 3);
                        materialBuffer.normal.data.set(uiTriangle.n2.toArray(), insertIndex * 9 + 6);
                    }

                    // Indices
                    {
                        materialBuffer.indices.data.set([
                            insertIndex * 3 + 0,
                            insertIndex * 3 + 1,
                            insertIndex * 3 + 2,
                        ], insertIndex * 3);
                    }

                    ++insertIndex;
                }
            }

            const material = mesh.getMaterialByName(materialName);
            ASSERT(material !== undefined);

            materialBuffers.push({
                buffer: materialBuffer,
                material: material,
                numElements: materialBuffer.indices.data.length,
                materialName: materialName,
            });
        });

        ProgressManager.Get.end(taskHandle);

        return materialBuffers;
    }

    public static createMaterialBuffer(triangleCount: number): TMeshBuffer {
        return {
            position: {
                numComponents: 3,
                data: new Float32Array(triangleCount * 3 * 3),
            },
            texcoord: {
                numComponents: 2,
                data: new Float32Array(triangleCount * 3 * 2),
            },
            normal: {
                numComponents: 3,
                data: new Float32Array(triangleCount * 3 * 3),
            },
            indices: {
                numComponents: 3,
                data: new Uint32Array(triangleCount * 3),
            },
        };
    }


}
