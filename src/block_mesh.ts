import { BasicBlockAssigner, OrderedDitheringBlockAssigner } from './block_assigner';
import { Voxel, VoxelMesh } from './voxel_mesh';
import { BlockAtlas, BlockInfo } from './block_atlas';
import { ColourSpace, AppError, ASSERT } from './util';
import { Renderer } from './renderer';
import { AppConstants } from './constants';

interface Block {
    voxel: Voxel;
    blockInfo: BlockInfo;
}

export interface BlockMeshParams {
    textureAtlas: string,
    blockPalette: string,
    ditheringEnabled: boolean,
    colourSpace: ColourSpace,
}

export class BlockMesh {
    private _blockPalette: string[];
    private _blocks: Block[];
    private _voxelMesh: VoxelMesh;

    public static createFromVoxelMesh(voxelMesh: VoxelMesh, blockMeshParams: BlockMeshParams) {
        const blockMesh = new BlockMesh(voxelMesh);
        blockMesh._assignBlocks(blockMeshParams);
        return blockMesh;
    }

    private constructor(voxelMesh: VoxelMesh) {
        this._blockPalette = [];
        this._blocks = [];
        this._voxelMesh = voxelMesh;
    }
    
    private _assignBlocks(blockMeshParams: BlockMeshParams) {
        BlockAtlas.Get.loadAtlas(blockMeshParams.textureAtlas);
        BlockAtlas.Get.loadPalette(blockMeshParams.blockPalette);

        const blockAssigner = blockMeshParams.ditheringEnabled ? new OrderedDitheringBlockAssigner() : new BasicBlockAssigner();
        
        const voxels = this._voxelMesh.getVoxels();
        for (let voxelIndex = 0; voxelIndex < voxels.length; ++voxelIndex) {
            const voxel = voxels[voxelIndex];
            const block = blockAssigner.assignBlock(voxel.colour, voxel.position, blockMeshParams.colourSpace);

            this._blocks.push({
                voxel: voxel,
                blockInfo: block,
            });
            if (!this._blockPalette.includes(block.name)) {
                this._blockPalette.push(block.name);
            }
        }
    }

    public getBlocks(): Block[] {
        return this._blocks;
    }

    public getBlockPalette() {
        return this._blockPalette;
    }

    public getVoxelMesh() {
        if (!this._voxelMesh) {
            throw new AppError('Could not get voxel mesh');
        }
        return this._voxelMesh;
    }

    public createBuffer() {
        ASSERT(this._blocks.length === this._voxelMesh.getVoxelCount());

        const numBlocks = this._blocks.length;
        const newBuffer = {
            position: {
                numComponents: AppConstants.ComponentSize.POSITION,
                data: Renderer.Get._voxelBufferRaw!.position.data,
            },
            colour: {
                numComponents: AppConstants.ComponentSize.COLOUR,
                data: Renderer.Get._voxelBufferRaw!.colour.data,
            },
            occlusion: {
                numComponents: AppConstants.ComponentSize.OCCLUSION,
                data: Renderer.Get._voxelBufferRaw!.occlusion.data,
            },
            texcoord: {
                numComponents: AppConstants.ComponentSize.TEXCOORD,
                data: Renderer.Get._voxelBufferRaw!.texcoord.data,
            },
            normal: {
                numComponents: AppConstants.ComponentSize.NORMAL,
                data: Renderer.Get._voxelBufferRaw!.normal.data,
            },
            indices: {
                numComponents: AppConstants.ComponentSize.INDICES,
                data: Renderer.Get._voxelBufferRaw!.indices.data,
            },
            blockTexcoord: {
                numComponents: AppConstants.ComponentSize.TEXCOORD,
                data: new Float32Array(numBlocks * AppConstants.VoxelMeshBufferComponentOffsets.TEXCOORD),
            },
        };

        const faceOrder = ['north', 'south', 'up', 'down', 'east', 'west'];
        let insertIndex = 0;
        for (let i = 0; i < numBlocks; ++i) {
            for (let f = 0; f < AppConstants.FACES_PER_VOXEL; ++f) {
                const faceName = faceOrder[f];
                const texcoord = this._blocks[i].blockInfo.faces[faceName].texcoord;
                for (let v = 0; v < AppConstants.VERTICES_PER_FACE; ++v) {
                    newBuffer.blockTexcoord.data[insertIndex++] = texcoord.u;
                    newBuffer.blockTexcoord.data[insertIndex++] = texcoord.v;
                }
            }
        }

        return newBuffer;
    }
}
