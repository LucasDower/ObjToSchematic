import { BasicBlockAssigner, OrderedDitheringBlockAssigner } from './block_assigner';
import { Voxel, VoxelMesh } from './voxel_mesh';
import { BlockInfo } from './block_atlas';
import { CustomError, LOG } from './util';
import { Renderer } from './renderer';

interface Block {
    voxel: Voxel;
    blockInfo: BlockInfo;
}

export class BlockMesh {
    private _ditheringEnabled: boolean;
    private _blockPalette: string[];
    private _blocks: Block[];
    private _voxelMesh?: VoxelMesh;

    public constructor(ditheringEnabled: boolean) {
        LOG('New block mesh');

        this._ditheringEnabled = ditheringEnabled;
        this._blockPalette = [];
        this._blocks = [];
    }

    public assignBlocks(voxelMesh: VoxelMesh) {
        LOG('Assigning blocks');

        const voxels = voxelMesh.getVoxels();
        const blockAssigner = this._ditheringEnabled ? new OrderedDitheringBlockAssigner() : new BasicBlockAssigner();

        for (let voxelIndex = 0; voxelIndex < voxels.length; ++voxelIndex) {
            const voxel = voxels[voxelIndex];
            const block = blockAssigner.assignBlock(voxel.colour, voxel.position);

            this._blocks.push({
                voxel: voxel,
                blockInfo: block,
            });
            if (!this._blockPalette.includes(block.name)) {
                this._blockPalette.push(block.name);
            }
        }

        this._voxelMesh = voxelMesh;
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

    public createBuffer(ambientOcclusionEnabled: boolean) {
        // const buffer = this.getVoxelMesh().createBuffer(ambientOcclusionEnabled);
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
}
