import { OtS_VoxelMesh } from './ots_voxel_mesh';
import { OtS_BlockMesh } from './ots_block_mesh';
import { OtS_FaceVisibility, OtS_VoxelMesh_Neighbourhood } from './ots_voxel_mesh_neighbourhood';
import { ASSERT } from './util/error_util';
import { Vector3 } from './vector';
import { RGBA, OtS_Colours, RGBAUtil } from './colour';

export type OtS_BlockData_PerBlock<T> = { name: string, colour: T }[];

export type OtS_BlockTextureData_Block = {
    name: string,
    textures: {
        up: string,
        down: string,
        north: string,
        south: string,
        east: string,
        west: string,
    }
}

export type OtS_BlockData_PerFace<T> = {
    blocks: OtS_BlockTextureData_Block[],
    textures: { [name: string]: T },
}

type OtS_BlockMesh_DataMode<T> = 
    | { type: 'per-block', data: OtS_BlockData_PerBlock<T> }
    | { type: 'per-face', data: OtS_BlockData_PerFace<T> }

export type OtS_FallableBehaviour = 'replace-falling' | 'replace-fallable' | 'place-string';

export type OtS_BlockMesh_ConverterConfig = {
    mode: OtS_BlockMesh_DataMode<RGBA>,
    dithering?: { mode: 'random' | 'ordered', magnitude: number },
    fallable?: OtS_FallableBehaviour,
    smoothness?: OtS_BlockMesh_DataMode<number> & { weight: number },
    resolution?: number, // [1, 255]
}

export class OtS_BlockMesh_Converter {
    private _config: OtS_BlockMesh_ConverterConfig;

    public constructor() {
        this._config = {
            mode: {
                type: 'per-block', data: [
                    { name: 'minecraft:stone', colour: OtS_Colours.WHITE }
                ]
            }
        };
    }

    /**
     * Attempts to set the config.
     * Returns false if the supplied config is invalid.
     */
    public setConfig(config: OtS_BlockMesh_ConverterConfig): boolean {
        // TODO: Validate

        // TODO: Validata per-face data has colours for each

        // TODO: Copy config

        this._config = config;
        return true;
    }

    public process(voxelMesh: OtS_VoxelMesh): OtS_BlockMesh {
        const blockMesh = new OtS_BlockMesh();

        // TODO: Fallable
        // TODO: Smoothness
        // TODO: Resolution
        // TODO: Dithering

        let neighbourhood: OtS_VoxelMesh_Neighbourhood | undefined;
        if (this._config.mode.type === 'per-face') {
            neighbourhood = new OtS_VoxelMesh_Neighbourhood();
            neighbourhood.process(voxelMesh, 'cardinal');
        }

        for (const { position, colour } of voxelMesh.getVoxels()) {
            let block: (string | null) = null;
            if (this._config.mode.type === 'per-block') {
                block = this._findClosestBlock_PerBlock(colour);
            } else {
                block = this._findClosestBlock_PerFace(colour, position, neighbourhood!);
            }

            if (block === null) {
                continue;
            }

            blockMesh.addBlock(position.x, position.y, position.z, block, true);
        }

        return blockMesh;
    }

    private _getBlockNames(): string[] {
        if (this._config.mode.type === 'per-block') {
            return Object.keys(this._config.mode.data);
        } else {
            return this._config.mode.data.blocks.map((block) => block.name );
        }
    }

    private _findClosestBlock_PerBlock(desiredColour: RGBA) {
        ASSERT(this._config.mode.type === 'per-block');

        let bestDistance = Infinity;
        let bestCandidate: (string | null) = null;

        for (const { name, colour } of this._config.mode.data) {
            const distance = RGBAUtil.squaredDistance(colour, desiredColour);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestCandidate = name;
            }
        }

        return bestCandidate;
    }

    private _findClosestBlock_PerFace(desiredColour: RGBA, position: Vector3, neighbourhood: OtS_VoxelMesh_Neighbourhood) {
        ASSERT(this._config.mode.type === 'per-face');

        let bestDistance = Infinity;
        let bestCandidate: (string | null) = null;

        for (const block of this._config.mode.data.blocks) {
            const visibility = neighbourhood.getFaceVisibility(position.x, position.y, position.z);
            if (visibility === null) {
                return null;
            }

            const averageColour: RGBA = { r: 0, g: 0, b: 0, a: 0 };
            {
                let count = 0;

                if (visibility & OtS_FaceVisibility.Up) {
                    const faceTexture = block.textures.up;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                if (visibility & OtS_FaceVisibility.Down) {
                    const faceTexture = block.textures.down;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                if (visibility & OtS_FaceVisibility.North) {
                    const faceTexture = block.textures.north;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                if (visibility & OtS_FaceVisibility.East) {
                    const faceTexture = block.textures.east;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                if (visibility & OtS_FaceVisibility.South) {
                    const faceTexture = block.textures.south;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                if (visibility & OtS_FaceVisibility.West) {
                    const faceTexture = block.textures.west;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }

                averageColour.r /= count;
                averageColour.g /= count;
                averageColour.b /= count;
                averageColour.a /= count;
            }

            const distance = RGBAUtil.squaredDistance(averageColour, desiredColour);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestCandidate = block.name;
            }
        }

        return bestCandidate;
    }

    /*
    private _getBlocks(visibility: OtS_FaceVisibility): IterableIterator<{ name: string, colour: RGBA }> {
        let currentIndex = 0;

        const blockCount = this._config.mode.type === 'per-block'
            ? this._config.mode.data.length
            : this._config.mode.data.blocks.length;

        const getBlockColour = (index: number): { name: string, colour: RGBA } => {
            if (this._config.mode.type === 'per-block') {
                return this._config.mode.data[index];
            } else {
                const block = this._config.mode.data.blocks[index];

                const averageColour: RGBA = { r: 0, g: 0, b: 0, a: 0 };
                let count = 0;
                if (visibility & OtS_FaceVisibility.Up) {
                    const faceTexture = block.textures.up;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                if (visibility & OtS_FaceVisibility.Down) {
                    const faceTexture = block.textures.down;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                if (visibility & OtS_FaceVisibility.North) {
                    const faceTexture = block.textures.north;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                if (visibility & OtS_FaceVisibility.East) {
                    const faceTexture = block.textures.east;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                if (visibility & OtS_FaceVisibility.South) {
                    const faceTexture = block.textures.south;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                if (visibility & OtS_FaceVisibility.West) {
                    const faceTexture = block.textures.west;
                    const faceColour = this._config.mode.data.textures[faceTexture];
                    RGBAUtil.add(averageColour, faceColour);
                    ++count;
                }
                averageColour.r /= count;
                averageColour.g /= count;
                averageColour.b /= count;
                averageColour.a /= count;

                return {
                    name: block.name,
                    colour: averageColour,
                }
            }
        }
        
        return {
            [Symbol.iterator]: function () {
                return this;
            },
            next: () => {
                if (currentIndex < blockCount) {
                    const block = getBlockColour(currentIndex);
                    ++currentIndex;

                    return { done: false, value: block };
                } else {
                    return { done: true, value: undefined };
                }
            },
        };
    }
    */
}