import { BasicBlockAssigner, OrderedDitheringBlockAssigner } from './block_assigner';
import { Voxel, VoxelMesh } from './voxel_mesh';
import { BlockAtlas, BlockInfo } from './block_atlas';
import { ColourSpace, CustomError, LOG } from './util';
import { Renderer } from './renderer';

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
    private _atlasUsed: string;

    public static createFromVoxelMesh(voxelMesh: VoxelMesh, blockMeshParams: BlockMeshParams) {
        const blockMesh = new BlockMesh(voxelMesh);
        blockMesh._assignBlocks(blockMeshParams);
        return blockMesh;
    }

    private constructor(voxelMesh: VoxelMesh) {
        LOG('New block mesh');

        this._blockPalette = [];
        this._blocks = [];
        this._voxelMesh = voxelMesh;
        this._atlasUsed = 'Vanilla';
    }
    
    private _assignBlocks(blockMeshParams: BlockMeshParams) {
        LOG('Assigning blocks');
        
        BlockAtlas.Get.loadAtlas(blockMeshParams.textureAtlas);
        BlockAtlas.Get.loadPalette(blockMeshParams.blockPalette);
        this._atlasUsed = blockMeshParams.textureAtlas;

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
            throw new CustomError('Could not get voxel mesh');
        }
        return this._voxelMesh;
    }

    public createBuffer() {
        const buffer = Renderer.Get._voxelBuffer.copy();

        const blockTexcoords: number[] = [];
        for (const block of this._blocks) {
            const faceOrder = ['north', 'south', 'up', 'down', 'east', 'west'];
            for (const face of faceOrder) {
                for (let i = 0; i < 4; ++i) {
                    const texcoord = block.blockInfo.faces[face].texcoord;
                    blockTexcoords.push(texcoord.u, texcoord.v);
                }
            }
        }
        buffer.attachNewAttribute({ name: 'blockTexcoord', numComponents: 2 }, blockTexcoords);
        buffer.removeAttribute('colour');

        return buffer;
    }

    public getAtlasUsed() {
        return this._atlasUsed;
    }

    public getAtlasSize() {
        return BlockAtlas.Get.getAtlasSize();
    }
}
