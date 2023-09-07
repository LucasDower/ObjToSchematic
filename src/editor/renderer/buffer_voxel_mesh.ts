import { TVoxelMeshBuffer, TVoxelMeshBufferDescription } from '../buffer';
import { Voxel, VoxelMesh } from '../../runtime/voxel_mesh';
import { AppConfig } from "../config";
import { ASSERT } from "../../runtime/util/error_util";
import { Vector3 } from "../../runtime/vector";
import { GeometryTemplates } from "../../runtime/geometry";
import { AttributeData } from "./render_buffer";
import { AppUtil, TOptional } from "../../runtime/util";
import { AppConstants } from "../../runtime/constants";
import { OcclusionManager } from "../../runtime/occlusion";

export type TBuffer_VoxelMesh = TVoxelMeshBufferDescription & { moreVoxelsToBuffer: boolean, progress: number };

export class BufferGenerator_VoxelMesh {
    private _voxelMesh: VoxelMesh;
    private _voxels: Voxel[];

    private _createAmbientOcclusionBuffer: boolean;
    private _nextChunkIndex: number;
    private _numTotalVoxels: number;
    private _cache: Map<number, TBuffer_VoxelMesh>;

    public constructor(voxelMesh: VoxelMesh, createAmbientOcclusionBuffer: boolean) {
        this._voxelMesh = voxelMesh;
        this._voxels = voxelMesh.getVoxels();

        this._createAmbientOcclusionBuffer = createAmbientOcclusionBuffer;
        this._nextChunkIndex = 0;
        this._numTotalVoxels = voxelMesh.getVoxelCount();
        this._cache = new Map();
    }

    public getNext() {
        const buffer = this._fromVoxelMesh(this._nextChunkIndex);
        this._cache.set(this._nextChunkIndex, buffer);
        ++this._nextChunkIndex;
        return buffer;
    }

    public getFromIndex(index: number): TOptional<TBuffer_VoxelMesh> {
        return this._cache.get(index);
    }

    private _fromVoxelMesh(chunkIndex: number): TBuffer_VoxelMesh {
        const voxelsStartIndex = chunkIndex * AppConfig.Get.VOXEL_BUFFER_CHUNK_SIZE;
        const voxelsEndIndex = Math.min((chunkIndex + 1) * AppConfig.Get.VOXEL_BUFFER_CHUNK_SIZE, this._numTotalVoxels);
        ASSERT(voxelsStartIndex < this._numTotalVoxels, 'Invalid voxel start index');

        const numBufferVoxels = voxelsEndIndex - voxelsStartIndex;
        const newBuffer: TVoxelMeshBuffer = BufferGenerator_VoxelMesh.createVoxelMeshBuffer(numBufferVoxels);

        const cube: AttributeData = GeometryTemplates.getBoxBufferData(new Vector3(0, 0, 0));

        // Build position buffer
        for (let i = 0; i < numBufferVoxels; ++i) {
            const voxel = this._voxels[i + voxelsStartIndex];
            const voxelPositionArray = voxel.position.toArray();

            for (let j = 0; j < AppConstants.VoxelMeshBufferComponentOffsets.POSITION; ++j) {
                newBuffer.position.data[i * AppConstants.VoxelMeshBufferComponentOffsets.POSITION + j] = cube.custom.position[j] + voxelPositionArray[j % 3];
            }
        }

        // Build colour buffer
        for (let i = 0; i < numBufferVoxels; ++i) {
            const voxel = this._voxels[i + voxelsStartIndex];
            newBuffer.colour.data[i * 96 + 0] = voxel.colour.r;
            newBuffer.colour.data[i * 96 + 1] = voxel.colour.g;
            newBuffer.colour.data[i * 96 + 2] = voxel.colour.b;
            newBuffer.colour.data[i * 96 + 3] = voxel.colour.a;

            AppUtil.Array.repeatedFill(newBuffer.colour.data, i * 96, 4, 24);
        }

        // Build normal buffer
        {
            newBuffer.normal.data.set(cube.custom.normal, 0);
            AppUtil.Array.repeatedFill(newBuffer.normal.data, 0, 72, numBufferVoxels);
        }

        // Build texcoord buffer
        {
            newBuffer.texcoord.data.set(cube.custom.texcoord, 0);
            AppUtil.Array.repeatedFill(newBuffer.texcoord.data, 0, 48, numBufferVoxels);
        }


        // Build indices buffer
        for (let i = 0; i < numBufferVoxels; ++i) {
            for (let j = 0; j < AppConstants.VoxelMeshBufferComponentOffsets.INDICES; ++j) {
                newBuffer.indices.data[i * AppConstants.VoxelMeshBufferComponentOffsets.INDICES + j] = cube.indices[j] + (i * AppConstants.INDICES_PER_VOXEL);
            }
        }

        // Build occlusion buffer
        if (this._createAmbientOcclusionBuffer) {
            const voxelOcclusionArray = new Float32Array(96);

            for (let i = 0; i < numBufferVoxels; ++i) {
                const voxel = this._voxels[i + voxelsStartIndex];
                OcclusionManager.Get.getOcclusions(voxelOcclusionArray, voxel.position, this._voxelMesh);

                newBuffer.occlusion.data.set(voxelOcclusionArray, i * AppConstants.VoxelMeshBufferComponentOffsets.OCCLUSION);
            }
        }

        return {
            buffer: newBuffer,
            numElements: newBuffer.indices.data.length,
            moreVoxelsToBuffer: voxelsEndIndex !== this._numTotalVoxels,
            progress: voxelsStartIndex / this._numTotalVoxels,
        };
    }

    public static createVoxelMeshBuffer(numVoxels: number): TVoxelMeshBuffer {
        return {
            position: {
                numComponents: 3,
                data: new Float32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.POSITION),
            },
            colour: {
                numComponents: 4,
                data: new Float32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.COLOUR),
            },
            occlusion: {
                numComponents: 4,
                data: new Float32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.OCCLUSION).fill(1.0),
            },
            texcoord: {
                numComponents: 2,
                data: new Float32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.TEXCOORD),
            },
            normal: {
                numComponents: 3,
                data: new Float32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.NORMAL),
            },
            indices: {
                numComponents: 3,
                data: new Uint32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.INDICES),
            },
        };
    }
}