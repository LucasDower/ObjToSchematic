import { ASSERT } from '../../Core/src/util/error_util';
import { OtS_Mesh } from '../../Core/src/ots_mesh';
import { Triangle } from '../../Core/src/triangle';
import { Material } from 'ots-core/src/materials';

export type TMeshBuffer = {
    position: { numComponents: 3, data: Float32Array },
    texcoord: { numComponents: 2, data: Float32Array },
    normal: { numComponents: 3, data: Float32Array },
    indices: { numComponents: 3, data: Uint32Array },
};

export type TMeshBufferDescription = {
    material: Material,
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
    public static fromMesh(mesh: OtS_Mesh): TMeshBufferDescription[] {
        const numTris = mesh.getTriangleCount();

        const triangles = Array.from(mesh.getTriangles());
        const materials = mesh.getMaterials();

        // Count the number of triangles that use each material
        const materialTriangleCount = new Map<TMaterialID, number>();
        {
            for (const triangle of triangles) {
                const materialName = triangle.material.name;
                const triangleCount = materialTriangleCount.get(materialName) ?? 0;
                materialTriangleCount.set(materialName, triangleCount + 1);
            }
        }

        const materialBuffers: TMeshBufferDescription[] = [];

        // Create the buffers for each material and fill with data from the triangles
        materialTriangleCount.forEach((triangleCount: number, materialName: string) => {
            const materialBuffer: TMeshBuffer = BufferGenerator.createMaterialBuffer(triangleCount);

            let insertIndex = 0;
            for (let triIndex = 0; triIndex < numTris; ++triIndex) {
                const triangle = triangles[triIndex];

                if (triangle.material.name === materialName) {
                    // Position
                    {
                        materialBuffer.position.data.set(triangle.v0.position.toArray(), insertIndex * 9 + 0);
                        materialBuffer.position.data.set(triangle.v1.position.toArray(), insertIndex * 9 + 3);
                        materialBuffer.position.data.set(triangle.v2.position.toArray(), insertIndex * 9 + 6);
                    }

                    // Texcoord
                    {
                        materialBuffer.texcoord.data.set([triangle.v0.texcoord.u, triangle.v0.texcoord.v], insertIndex * 6 + 0);
                        materialBuffer.texcoord.data.set([triangle.v1.texcoord.u, triangle.v1.texcoord.v], insertIndex * 6 + 2);
                        materialBuffer.texcoord.data.set([triangle.v2.texcoord.u, triangle.v2.texcoord.v], insertIndex * 6 + 4);
                    }

                    // Normal
                    const normalArray = Triangle.CalcNormal(triangle.v0.position, triangle.v1.position, triangle.v2.position).toArray();
                    {
                        materialBuffer.normal.data.set(normalArray, insertIndex * 9 + 0);
                        materialBuffer.normal.data.set(normalArray, insertIndex * 9 + 3);
                        materialBuffer.normal.data.set(normalArray, insertIndex * 9 + 6);
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

            const material = materials.find((someMaterial) => someMaterial.name === materialName);
            ASSERT(material !== undefined, 'Unknown material');

            materialBuffers.push({
                buffer: materialBuffer,
                material: material,
                numElements: materialBuffer.indices.data.length,
                materialName: materialName,
            });
        });

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
