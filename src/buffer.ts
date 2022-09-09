import { BlockMesh } from "./block_mesh";
import { MaterialType, Mesh, SolidMaterial, TexturedMaterial } from "./mesh";
import { TextureMaterialRenderAddons } from "./renderer";
import { AppError } from "./util/error_util";
import { VoxelMesh } from "./voxel_mesh";

export type TMeshBuffer = {
    position: { numComponents: 3, data: Float32Array },
    texcoord: { numComponents: 2, data: Float32Array },
    normal:   { numComponents: 3, data: Float32Array },
    indices:  { numComponents: 3, data: Uint32Array  },
}

export type TMeshBufferDescription = {
    material: SolidMaterial | (TexturedMaterial)
    buffer: TMeshBuffer,
    numElements: number,
}

type TMaterialID = string;

export class BufferGenerator {

    public static fromMesh(mesh: Mesh): TMeshBufferDescription[] {
        // Count the number of triangles that use each material
        const materialTriangleCount = new Map<TMaterialID, number>();
        {
            for (let triIndex = 0; triIndex < mesh.getTriangleCount(); ++triIndex) {
                const materialName = mesh.getMaterialByTriangle(triIndex);
                const triangleCount = materialTriangleCount.get(materialName) ?? 0;
                materialTriangleCount.set(materialName, triangleCount + 1);
            }
        }

        const materialBuffers: TMeshBufferDescription[] = [];

        // Create the buffers for each material and fill with data from the triangles
        materialTriangleCount.forEach((triangleCount: number, materialName: string) => {
            const materialBuffer: TMeshBuffer = BufferGenerator.createMaterialBuffer(triangleCount);

            let insertIndex = 0;
            for (let triIndex = 0; triIndex < mesh.getTriangleCount(); ++triIndex) {
                const material = mesh.getMaterialByTriangle(triIndex);
                if (material === materialName) {
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
                        const normalArray = uiTriangle.getNormal().toArray();
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

            const material = mesh.getMaterialByName(materialName);
            materialBuffers.push({
                buffer: materialBuffer,
                material: material,
                numElements: materialBuffer.indices.data.length,
            });
        });

        return materialBuffers;
    }

    /*
    public static fromVoxelMesh(voxelMesh: VoxelMesh) {

    }

    public static fromBlockMesh(blockMesh: BlockMesh) {

    }
    */

    private static createMaterialBuffer(triangleCount: number): TMeshBuffer {
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