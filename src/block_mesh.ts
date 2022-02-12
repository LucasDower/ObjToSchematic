import { BasicBlockAssigner, OrderedDitheringBlockAssigner } from './block_assigner';
import { Voxel, VoxelMesh } from './voxel_mesh';
import { BlockInfo } from './block_atlas';
import { CustomError, LOG } from './util';
import { SegmentedBuffer, VoxelData } from './buffer';
import { OcclusionManager } from './occlusion';
import { GeometryTemplates } from './geometry';
import { AppConfig } from './config';
import { Vector3 } from './vector';

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
        const buffer = new SegmentedBuffer(262144, [
            { name: 'position', numComponents: 3},
            { name: 'normal', numComponents: 3 },
            { name: 'occlusion', numComponents: 4 },
            { name: 'texcoord', numComponents: 2 },
            { name: 'blockTexcoord', numComponents: 2 },
        ]);

        for (const block of this._blocks) {
            // Each vertex of a face needs the occlusion data for the other 3 vertices
            // in it's face, not just itself. Also flatten occlusion data.
            let occlusions: number[];
            if (ambientOcclusionEnabled) {
                occlusions = OcclusionManager.Get.getOcclusions(block.voxel.position, this.getVoxelMesh());
            } else {
                occlusions = OcclusionManager.Get.getBlankOcclusions();
            }

            const data: VoxelData = GeometryTemplates.getBoxBufferData(block.voxel.position);
            data.occlusion = occlusions;

            // Assign the textures to each face
            data.blockTexcoord = [];
            const faceOrder = ['north', 'south', 'up', 'down', 'east', 'west'];
            for (const face of faceOrder) {
                for (let i = 0; i < 4; ++i) {
                    const texcoord = block.blockInfo.faces[face].texcoord;
                    data.blockTexcoord.push(texcoord.u, texcoord.v);
                }
            }

            const faceNormals = OcclusionManager.Get.getFaceNormals();
            if (AppConfig.FACE_CULLING) {
                // TODO: Optmise, enabling FACE_CULLING is slower than not bothering
                for (let i = 0; i < 6; ++i) {
                    if (!this.getVoxelMesh().isVoxelAt(Vector3.add(block.voxel.position, faceNormals[i]))) {
                        buffer.add({
                            position: data.position.slice(i * 12, (i+1) * 12),
                            occlusion: data.occlusion.slice(i * 16, (i+1) * 16),
                            normal: data.normal.slice(i * 12, (i+1) * 12),
                            indices: data.indices.slice(0, 6),
                            texcoord: data.texcoord.slice(i * 8, (i+1) * 8),
                            colour: data.colour.slice(i * 12, (i+1) * 12),
                            blockTexcoord: data.blockTexcoord.slice(i * 8, (i+1) * 8),
                        });
                    }
                }
            } else {
                buffer.add(data);
            }
        }

        return buffer;
    }
}
