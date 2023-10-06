import { OtS_Offset, OtS_VoxelMesh_Neighbourhood } from '../../../Core/src/ots_voxel_mesh_neighbourhood';
import { ASSERT } from '../../../Core/src/util/error_util';
import { Vector3 } from '../../../Core/src/vector';

export class OtSE_AmbientOcclusion {
    private _occlusionNeighboursIndices!: number[]; // Ew
    private _occlusionsSetup: boolean;

    private static _instance: OtSE_AmbientOcclusion;
    private static get _Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._occlusionsSetup = false;
        this._setupOcclusions();
    }

    // Assume's buffer is of length 96
    public static GetOcclusions(buffer: Float32Array, centre: Vector3, voxelMeshNeighbourhood: OtS_VoxelMesh_Neighbourhood): void {
        // Cache local neighbours
        const neighbourData = voxelMeshNeighbourhood.getNeighbours(centre.x, centre.y, centre.z);
        if (neighbourData === undefined) {
            // This voxel has no neighbours within a 1-block radius
            buffer.fill(0.0);
            return;
        }

        const localNeighbourhoodCache = new Array<number>(27);
        for (let i = 0; i < 27; ++i) {
            localNeighbourhoodCache[i] = (neighbourData & (1 << i)) > 0 ? 1 : 0;
        }

        // For each face
        for (let f = 0; f < 6; ++f) {
            for (let v = 0; v < 4; ++v) {
                let numNeighbours = 0;
                let occlusionValue = 1.0;
                for (let i = 0; i < 2; ++i) {
                    const neighbourIndex = this._Get._occlusionNeighboursIndices[this._GetOcclusionMapIndex(f, v, i)];
                    numNeighbours += localNeighbourhoodCache[neighbourIndex];
                }
                // If both edge blocks along this vertex exist,
                // assume corner exists (even if it doesnt)
                // (This is a stylistic choice)
                //if (numNeighbours == 2 && AppConfig.Get.AMBIENT_OCCLUSION_OVERRIDE_CORNER) {
                if (numNeighbours == 2) {
                    ++numNeighbours;
                } else {
                    const neighbourIndex = this._Get._occlusionNeighboursIndices[this._GetOcclusionMapIndex(f, v, 2)];
                    numNeighbours += localNeighbourhoodCache[neighbourIndex];
                }

                // Convert from occlusion denoting the occlusion factor to the
                // attenuation in light value: 0 -> 1.0, 1 -> 0.8, 2 -> 0.6, 3 -> 0.4
                occlusionValue = 1.0 - 0.2 * numNeighbours;

                const baseIndex = f * 16 + v;
                buffer[baseIndex + 0] = occlusionValue;
                buffer[baseIndex + 4] = occlusionValue;
                buffer[baseIndex + 8] = occlusionValue;
                buffer[baseIndex + 12] = occlusionValue;
            }
        }
    }

    private _setupOcclusions() {
        ASSERT(!this._occlusionsSetup);

        // TODO: Find some for-loop to clean this up
        // [Edge, Edge, Corrner]
        const occlusionNeighbours = [
            [
                // +X
                [new Vector3(1, 1, 0), new Vector3(1, 0, -1), new Vector3(1, 1, -1)],
                [new Vector3(1, -1, 0), new Vector3(1, 0, -1), new Vector3(1, -1, -1)],
                [new Vector3(1, 1, 0), new Vector3(1, 0, 1), new Vector3(1, 1, 1)],
                [new Vector3(1, -1, 0), new Vector3(1, 0, 1), new Vector3(1, -1, 1)],
            ],

            [
                // -X
                [new Vector3(-1, 1, 0), new Vector3(-1, 0, 1), new Vector3(-1, 1, 1)],
                [new Vector3(-1, -1, 0), new Vector3(-1, 0, 1), new Vector3(-1, -1, 1)],
                [new Vector3(-1, 1, 0), new Vector3(-1, 0, -1), new Vector3(-1, 1, -1)],
                [new Vector3(-1, -1, 0), new Vector3(-1, 0, -1), new Vector3(-1, -1, -1)],
            ],

            [
                // +Y
                [new Vector3(-1, 1, 0), new Vector3(0, 1, 1), new Vector3(-1, 1, 1)],
                [new Vector3(-1, 1, 0), new Vector3(0, 1, -1), new Vector3(-1, 1, -1)],
                [new Vector3(1, 1, 0), new Vector3(0, 1, 1), new Vector3(1, 1, 1)],
                [new Vector3(1, 1, 0), new Vector3(0, 1, -1), new Vector3(1, 1, -1)],
            ],

            [
                // -Y
                [new Vector3(-1, -1, 0), new Vector3(0, -1, -1), new Vector3(-1, -1, -1)],
                [new Vector3(-1, -1, 0), new Vector3(0, -1, 1), new Vector3(-1, -1, 1)],
                [new Vector3(1, -1, 0), new Vector3(0, -1, -1), new Vector3(1, -1, -1)],
                [new Vector3(1, -1, 0), new Vector3(0, -1, 1), new Vector3(1, -1, 1)],
            ],

            [
                // + Z
                [new Vector3(0, 1, 1), new Vector3(1, 0, 1), new Vector3(1, 1, 1)],
                [new Vector3(0, -1, 1), new Vector3(1, 0, 1), new Vector3(1, -1, 1)],
                [new Vector3(0, 1, 1), new Vector3(-1, 0, 1), new Vector3(-1, 1, 1)],
                [new Vector3(0, -1, 1), new Vector3(-1, 0, 1), new Vector3(-1, -1, 1)],
            ],

            [
                // -Z
                [new Vector3(0, 1, -1), new Vector3(-1, 0, -1), new Vector3(-1, 1, -1)],
                [new Vector3(0, -1, -1), new Vector3(-1, 0, -1), new Vector3(-1, -1, -1)],
                [new Vector3(0, 1, -1), new Vector3(1, 0, -1), new Vector3(1, 1, -1)],
                [new Vector3(0, -1, -1), new Vector3(1, 0, -1), new Vector3(1, -1, -1)],
            ],
        ];

        this._occlusionNeighboursIndices = [];
        for (let i = 0; i < 6; ++i) {
            for (let j = 0; j < 4; ++j) {
                for (let k = 0; k < 3; ++k) {
                    const index = OtSE_AmbientOcclusion._GetOcclusionMapIndex(i, j, k);
                    const neighbour = occlusionNeighbours[i][j][k];
                    this._occlusionNeighboursIndices[index] = OtS_VoxelMesh_Neighbourhood.getNeighbourIndex(neighbour.x as OtS_Offset, neighbour.y as OtS_Offset, neighbour.z as OtS_Offset);
                }
            }
        }

        this._occlusionsSetup = true;
    }

    private static _GetOcclusionMapIndex(faceIndex: number, vertexIndex: number, offsetIndex: number): number {
        return (12 * faceIndex) + (3 * vertexIndex) + offsetIndex;
    }
}
