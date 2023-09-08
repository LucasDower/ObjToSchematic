import { TBlockMeshBuffer, TBlockMeshBufferDescription, TVoxelMeshBuffer } from "../buffer";
import { AppConfig } from "../config";
import { ASSERT } from "../../runtime/util/error_util";
import { AppUtil } from "../../runtime/util";
import { AppConstants } from "../../runtime/constants";
import { Block, BlockMesh } from "../../runtime/block_mesh";
import { BufferGenerator_VoxelMesh } from "./buffer_voxel_mesh";

export type TBuffer_BlockMesh = TBlockMeshBufferDescription & { moreBlocksToBuffer: boolean, progress: number };

export class BufferGenerator_BlockMesh {
    private _blockMesh: BlockMesh;
    private _blocks: Block[];

    private _bufferGenerator_VoxelMesh: BufferGenerator_VoxelMesh;
    private _nextChunkIndex: number;
    private _lightingRamp: Map<number, number>;
    private _numTotalBlocks: number;

    public constructor(blockMesh: BlockMesh, bufferGenerator_VoxelMesh: BufferGenerator_VoxelMesh) {
        this._blockMesh = blockMesh;
        this._blocks = blockMesh.getBlocks();

        this._bufferGenerator_VoxelMesh = bufferGenerator_VoxelMesh;
        this._nextChunkIndex = 0;
        this._numTotalBlocks = this._blocks.length;
        this._lightingRamp = new Map<number, number>([
            [15, 40 / 40],
            [14, 40 / 40],
            [13, 39 / 40],
            [12, 37 / 40],
            [11, 35 / 40],
            [10, 32 / 40],
            [9, 29 / 40],
            [8, 26 / 40],
            [7, 23 / 40],
            [6, 20 / 40],
            [5, 17 / 40],
            [4, 14 / 40],
            [3, 12 / 40],
            [2, 9 / 40],
            [1, 7 / 40],
            [0, 5 / 40],
        ]);
    }

    public getNext() {
        const buffer = this._fromBlockMesh(this._nextChunkIndex);
        ++this._nextChunkIndex;
        return buffer;
    }

    private _fromBlockMesh(chunkIndex: number): TBuffer_BlockMesh {
        const blocksStartIndex = chunkIndex * AppConfig.Get.VOXEL_BUFFER_CHUNK_SIZE;
        const blocksEndIndex = Math.min((chunkIndex + 1) * AppConfig.Get.VOXEL_BUFFER_CHUNK_SIZE, this._numTotalBlocks);
        ASSERT(blocksStartIndex < this._numTotalBlocks, 'Invalid block start index');

        const numBufferBlocks = blocksEndIndex - blocksStartIndex;

        const voxelChunkBuffer = this._bufferGenerator_VoxelMesh.getFromIndex(chunkIndex);
        ASSERT(voxelChunkBuffer !== undefined, 'Invalid cached voxel mesh buffer');

        const newBuffer = BufferGenerator_BlockMesh.createBlockMeshBuffer(numBufferBlocks, voxelChunkBuffer.buffer);

        const faceOrder = ['north', 'south', 'up', 'down', 'east', 'west'];
        let insertIndex = 0;
        let lightingInsertIndex = 0;

        for (let i = 0; i < numBufferBlocks; ++i) {
            const blockIndex = i + blocksStartIndex;
            const blockLighting = this._blockMesh.getBlockLighting(this._blocks[blockIndex].voxel.position);

            for (let f = 0; f < AppConstants.FACES_PER_VOXEL; ++f) {
                const faceName = faceOrder[f];
                const faceLighting = this._lightingRamp.get(blockLighting[f] ?? 15) ?? 1.0;

                const texcoord = this._blocks[blockIndex].blockInfo.faces[faceName].texcoord;
                for (let v = 0; v < AppConstants.VERTICES_PER_FACE; ++v) {
                    newBuffer.blockTexcoord.data[insertIndex++] = texcoord.u;
                    newBuffer.blockTexcoord.data[insertIndex++] = texcoord.v;

                    newBuffer.lighting.data[lightingInsertIndex++] = faceLighting;
                }
            }

            newBuffer.blockPosition.data[i * 72 + 0] = this._blocks[blockIndex].voxel.position.x;
            newBuffer.blockPosition.data[i * 72 + 1] = this._blocks[blockIndex].voxel.position.y;
            newBuffer.blockPosition.data[i * 72 + 2] = this._blocks[blockIndex].voxel.position.z;
            AppUtil.Array.repeatedFill(newBuffer.blockPosition.data, i * 72, 3, 24);
        }

        return {
            buffer: newBuffer,
            numElements: newBuffer.indices.data.length,
            moreBlocksToBuffer: voxelChunkBuffer.moreVoxelsToBuffer,
            progress: voxelChunkBuffer.progress,
        };
    }

    public static createBlockMeshBuffer(numBlocks: number, voxelMeshBuffer: TVoxelMeshBuffer): TBlockMeshBuffer {
        return {
            position: {
                numComponents: AppConstants.ComponentSize.POSITION,
                data: voxelMeshBuffer.position.data,
            },
            colour: {
                numComponents: AppConstants.ComponentSize.COLOUR,
                data: voxelMeshBuffer.colour.data,
            },
            occlusion: {
                numComponents: AppConstants.ComponentSize.OCCLUSION,
                data: voxelMeshBuffer.occlusion.data,
            },
            texcoord: {
                numComponents: AppConstants.ComponentSize.TEXCOORD,
                data: voxelMeshBuffer.texcoord.data,
            },
            normal: {
                numComponents: AppConstants.ComponentSize.NORMAL,
                data: voxelMeshBuffer.normal.data,
            },
            indices: {
                numComponents: AppConstants.ComponentSize.INDICES,
                data: voxelMeshBuffer.indices.data,
            },
            blockTexcoord: {
                numComponents: AppConstants.ComponentSize.TEXCOORD,
                data: new Float32Array(numBlocks * AppConstants.VoxelMeshBufferComponentOffsets.TEXCOORD),
            },
            blockPosition: {
                numComponents: AppConstants.ComponentSize.POSITION,
                data: new Float32Array(numBlocks * AppConstants.VoxelMeshBufferComponentOffsets.POSITION),
            },
            lighting: {
                numComponents: AppConstants.ComponentSize.LIGHTING,
                data: new Float32Array(numBlocks * AppConstants.VoxelMeshBufferComponentOffsets.LIGHTING),
            },
        };
    }
}