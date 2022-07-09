import { BasicBlockAssigner, BlockAssignerFactory, OrderedDitheringBlockAssigner, RandomDitheringBlockAssigner, TBlockAssigners } from './block_assigner';
import { Voxel, VoxelMesh } from './voxel_mesh';
import { BlockAtlas, BlockInfo } from './block_atlas';
import { ColourSpace, AppError, ASSERT, RESOURCES_DIR } from './util';
import { Renderer } from './renderer';
import { AppConstants } from './constants';

import fs from 'fs';
import path from 'path';
import { StatusHandler } from './status';
import { Vector3 } from './vector';

interface Block {
    voxel: Voxel;
    blockInfo: BlockInfo;
}

export type FallableBehaviour = 'replace-falling' | 'replace-fallable' | 'place-string' | 'do-nothing';

export interface BlockMeshParams {
    textureAtlas: string,
    blockPalette: string,
    blockAssigner: TBlockAssigners,
    colourSpace: ColourSpace,
    fallable: FallableBehaviour,
}

export class BlockMesh {
    private _blockPalette: string[];
    private _blocks: Block[];
    private _voxelMesh: VoxelMesh;
    private _fallableBlocks: string[];
    private _atlasUsed: string;

    public static createFromVoxelMesh(voxelMesh: VoxelMesh, blockMeshParams: BlockMeshParams) {
        const blockMesh = new BlockMesh(voxelMesh);
        blockMesh._assignBlocks(blockMeshParams);
        return blockMesh;
    }

    private constructor(voxelMesh: VoxelMesh) {
        this._blockPalette = [];
        this._blocks = [];
        this._voxelMesh = voxelMesh;
        this._atlasUsed = 'Vanilla';

        const fallableBlocksString = fs.readFileSync(path.join(RESOURCES_DIR, 'fallable_blocks.json'), 'utf-8');
        this._fallableBlocks = JSON.parse(fallableBlocksString).fallable_blocks;
    }
    
    private _assignBlocks(blockMeshParams: BlockMeshParams) {
        BlockAtlas.Get.loadAtlas(blockMeshParams.textureAtlas);
        BlockAtlas.Get.loadPalette(blockMeshParams.blockPalette);
        this._atlasUsed = blockMeshParams.textureAtlas;

        const blockAssigner = BlockAssignerFactory.GetAssigner(blockMeshParams.blockAssigner);
        
        let countFalling = 0;
        const voxels = this._voxelMesh.getVoxels();
        for (let voxelIndex = 0; voxelIndex < voxels.length; ++voxelIndex) {
            const voxel = voxels[voxelIndex];
            let block = blockAssigner.assignBlock(voxel.colour, voxel.position, blockMeshParams.colourSpace);

            const isFallable = this._fallableBlocks.includes(block.name);
            const isSupported = this._voxelMesh.isVoxelAt(Vector3.add(voxel.position, new Vector3(0, -1, 0)));
            
            if (isFallable && !isSupported) {
                ++countFalling;
            }

            let shouldReplace = (blockMeshParams.fallable === 'replace-fallable' && isFallable);
            shouldReplace ||= (blockMeshParams.fallable === 'replace-falling' && isFallable && !isSupported);

            if (shouldReplace) {
                const replacedBlock = blockAssigner.assignBlock(voxel.colour, voxel.position, blockMeshParams.colourSpace, this._fallableBlocks);
                // LOG(`Replacing ${block.name} with ${replacedBlock.name}`);
                block = replacedBlock;
            }

            this._blocks.push({
                voxel: voxel,
                blockInfo: block,
            });
            if (!this._blockPalette.includes(block.name)) {
                this._blockPalette.push(block.name);
            }
        }

        if (blockMeshParams.fallable === 'do-nothing' && countFalling > 0) {
            StatusHandler.Get.add('warning', `${countFalling.toLocaleString()} blocks will fall under gravity when this structure is placed`);
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

    public getAtlasSize() {
        return BlockAtlas.Get.getAtlasSize();
    }

    public getAtlasUsed() {
        return this._atlasUsed;
    }
}
