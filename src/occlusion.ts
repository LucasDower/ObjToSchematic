import { AppConfig } from './config';
import { ASSERT } from './util/error_util';
import { Vector3 } from './vector';
import { VoxelMesh } from './voxel_mesh';

export class OcclusionManager {
    private _occlusionNeighboursIndices!: number[]; // Ew
    private _occlusions: number[];
    private _localNeighbourhoodCache: number[];
    private _occlusionsSetup: boolean;

    private static _instance: OcclusionManager;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._occlusionsSetup = false;
        this._setupOcclusions();
        this._occlusions = new Array<number>(6 * 4 * 4);
        this._localNeighbourhoodCache = Array<number>(27);
    }

    public getBlankOcclusions() {
        return new Array<number>(96).fill(1.0);
    }

    public getOcclusions(centre: Vector3, voxelMesh: VoxelMesh) {
        // Cache local neighbours
        const neighbourData = voxelMesh.getNeighbourhoodMap().get(centre.hash());
        if (neighbourData === undefined) {
            // This voxel has no neighbours within a 1-block radius
            return this.getBlankOcclusions();
        }

        for (let i = 0; i < 27; ++i) {
            this._localNeighbourhoodCache[i] = (neighbourData.value & (1 << i)) > 0 ? 1 : 0;
        }

        // For each face
        for (let f = 0; f < 6; ++f) {
            for (let v = 0; v < 4; ++v) {
                let numNeighbours = 0;
                let occlusionValue = 1.0;
                for (let i = 0; i < 2; ++i) {
                    const neighbourIndex = this._occlusionNeighboursIndices[this._getOcclusionMapIndex(f, v, i)];
                    numNeighbours += this._localNeighbourhoodCache[neighbourIndex];
                }
                // If both edge blocks along this vertex exist,
                // assume corner exists (even if it doesnt)
                // (This is a stylistic choice)
                if (numNeighbours == 2 && AppConfig.Get.AMBIENT_OCCLUSION_OVERRIDE_CORNER) {
                    ++numNeighbours;
                } else {
                    const neighbourIndex = this._occlusionNeighboursIndices[this._getOcclusionMapIndex(f, v, 2)];
                    numNeighbours += this._localNeighbourhoodCache[neighbourIndex];
                }

                // Convert from occlusion denoting the occlusion factor to the
                // attenuation in light value: 0 -> 1.0, 1 -> 0.8, 2 -> 0.6, 3 -> 0.4
                occlusionValue = 1.0 - 0.2 * numNeighbours;


                const baseIndex = f * 16 + v;
                this._occlusions[baseIndex + 0] = occlusionValue;
                this._occlusions[baseIndex + 4] = occlusionValue;
                this._occlusions[baseIndex + 8] = occlusionValue;
                this._occlusions[baseIndex + 12] = occlusionValue;
            }
        }

        return this._occlusions;
    }

    public static getNeighbourIndex(neighbour: Vector3) {
        return 9 * (neighbour.x + 1) + 3 * (neighbour.y + 1) + (neighbour.z + 1);
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
                    const index = this._getOcclusionMapIndex(i, j, k);
                    this._occlusionNeighboursIndices[index] = OcclusionManager.getNeighbourIndex(occlusionNeighbours[i][j][k]);
                }
            }
        }

        this._occlusionsSetup = true;
    }

    private _getOcclusionMapIndex(faceIndex: number, vertexIndex: number, offsetIndex: number): number {
        return (12 * faceIndex) + (3 * vertexIndex) + offsetIndex;
    }
}
