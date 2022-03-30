/*
export class Occlusion {
    private _occlusionNeighboursIndices!: Array<Array<Array<number>>>; // Ew

    public static calculateOcclusions(centre: Vector3, voxelMesh: VoxelMesh) {
        // Cache local neighbours
        const localNeighbourhoodCache = Array<number>(27);
        for (let i = -1; i <= 1; ++i) {
            for (let j = -1; j <= 1; ++j) {
                for (let k = -1; k <= 1; ++k) {
                    const neighbour = new Vector3(i, j, k);
                    const neighbourIndex = Renderer._getNeighbourIndex(neighbour);
                    localNeighbourhoodCache[neighbourIndex] = voxelMesh.isVoxelAt(Vector3.add(centre, neighbour)) ? 1 : 0;
                }
            }
        }

        const occlusions = new Array<Array<number>>(6);
        // For each face
        for (let f = 0; f < 6; ++f) {
            occlusions[f] = [1, 1, 1, 1];

            // Only compute ambient occlusion if this face is visible
            const faceNormal = Occlusion._faceNormals[f];
            const faceNeighbourIndex = Occlusion._getNeighbourIndex(faceNormal);
            const faceVisible = localNeighbourhoodCache[faceNeighbourIndex] === 0;

            if (faceVisible) {
                for (let v = 0; v < 4; ++v) {
                    let numNeighbours = 0;
                    for (let i = 0; i < 2; ++i) {
                        const neighbourIndex = this._occlusionNeighboursIndices[f][v][i];
                        numNeighbours += localNeighbourhoodCache[neighbourIndex];
                    }
                    // If both edge blocks along this vertex exist,
                    // assume corner exists (even if it doesnt)
                    // (This is a stylistic choice)
                    if (numNeighbours == 2 && AppConfig.AMBIENT_OCCLUSION_OVERRIDE_CORNER) {
                        ++numNeighbours;
                    } else {
                        const neighbourIndex = this._occlusionNeighboursIndices[f][v][2];
                        numNeighbours += localNeighbourhoodCache[neighbourIndex];
                    }

                    // Convert from occlusion denoting the occlusion factor to the
                    // attenuation in light value: 0 -> 1.0, 1 -> 0.8, 2 -> 0.6, 3 -> 0.4
                    occlusions[f][v] = 1.0 - 0.2 * numNeighbours;
                }
            }
        }

        return occlusions;
    }

    private static _getNeighbourIndex(neighbour: Vector3) {
        return 9 * (neighbour.x + 1) + 3 * (neighbour.y + 1) + (neighbour.z + 1);
    }

    private static _faceNormals = [
        new Vector3(1, 0, 0), new Vector3(-1, 0, 0),
        new Vector3(0, 1, 0), new Vector3(0, -1, 0),
        new Vector3(0, 0, 1), new Vector3(0, 0, -1),
    ];
}
*/

import { AppConfig } from './config';
import { ASSERT } from './util';
import { Vector3 } from './vector';
import { VoxelMesh } from './voxel_mesh';

export class OcclusionManager {
    private _occlusionNeighboursIndices!: Array<Array<Array<number>>>; // Ew

    private static _instance: OcclusionManager;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    constructor() {
        this._setupOcclusions();
    }

    public getBlankOcclusions() {
        return new Array<number>(96).fill(1.0);
        /*
        const blankOcclusions = new Array<Array<number>>(6);
        for (let f = 0; f < 6; ++f) {
            blankOcclusions[f] = [1, 1, 1, 1];
        }
        return this._expandOcclusions(blankOcclusions);
        */
    }

    public getOcclusions(centre: Vector3, voxelMesh: VoxelMesh) {
        // Cache local neighbours
        const localNeighbourhoodCache = Array<number>(27);
        for (let i = -1; i <= 1; ++i) {
            for (let j = -1; j <= 1; ++j) {
                for (let k = -1; k <= 1; ++k) {
                    const neighbour = new Vector3(i, j, k);
                    const neighbourIndex = this._getNeighbourIndex(neighbour);
                    localNeighbourhoodCache[neighbourIndex] = voxelMesh.isVoxelAt(Vector3.add(centre, neighbour)) ? 1 : 0;
                }
            }
        }

        // const occlusions = new Array<Array<number>>(6);
        const occlusions = new Array<number>(6 * 4).fill(1.0);
        // For each face
        for (let f = 0; f < 6; ++f) {
            // occlusions[f] = [1, 1, 1, 1];

            // Only compute ambient occlusion if this face is visible
            const faceNormal = this.getFaceNormals()[f];
            const faceNeighbourIndex = this._getNeighbourIndex(faceNormal);
            const faceVisible = localNeighbourhoodCache[faceNeighbourIndex] === 0;

            if (faceVisible) {
                for (let v = 0; v < 4; ++v) {
                    let numNeighbours = 0;
                    for (let i = 0; i < 2; ++i) {
                        const neighbourIndex = this._occlusionNeighboursIndices[f][v][i];
                        numNeighbours += localNeighbourhoodCache[neighbourIndex];
                    }
                    // If both edge blocks along this vertex exist,
                    // assume corner exists (even if it doesnt)
                    // (This is a stylistic choice)
                    if (numNeighbours == 2 && AppConfig.AMBIENT_OCCLUSION_OVERRIDE_CORNER) {
                        ++numNeighbours;
                    } else {
                        const neighbourIndex = this._occlusionNeighboursIndices[f][v][2];
                        numNeighbours += localNeighbourhoodCache[neighbourIndex];
                    }

                    // Convert from occlusion denoting the occlusion factor to the
                    // attenuation in light value: 0 -> 1.0, 1 -> 0.8, 2 -> 0.6, 3 -> 0.4
                    occlusions[f * 4 + v] = 1.0 - 0.2 * numNeighbours;
                }
            }
        }

        return this._expandOcclusions(occlusions);
    }

    public getFaceNormals() {
        return [
            new Vector3(1, 0, 0), new Vector3(-1, 0, 0),
            new Vector3(0, 1, 0), new Vector3(0, -1, 0),
            new Vector3(0, 0, 1), new Vector3(0, 0, -1),
        ];
    }

    private _getNeighbourIndex(neighbour: Vector3) {
        return 9*(neighbour.x+1) + 3*(neighbour.y+1) + (neighbour.z+1);
    }

    private _setupOcclusions() {
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

        this._occlusionNeighboursIndices = new Array<Array<Array<number>>>();
        for (let i = 0; i < 6; ++i) {
            const row = new Array<Array<number>>();
            for (let j = 0; j < 4; ++j) {
                row.push(occlusionNeighbours[i][j].map((x) => this._getNeighbourIndex(x)));
            }
            this._occlusionNeighboursIndices.push(row);
        }
    }

    private _expandOcclusions(occlusions: number[]) {
        const expandedOcclusions = new Array<number>(96);
        for (let j = 0; j < 6; ++j) {
            for (let k = 0; k < 16; ++k) {
                expandedOcclusions[j * 16 + k] = occlusions[(j * 4) + (k % 4)];
            }
        }

        return expandedOcclusions;
    }
}
