import { AttributeData } from './buffer';
import { AppConstants } from './constants';
import { GeometryTemplates } from './geometry';
import { HashMap } from './hash_map';
import { OcclusionManager } from './occlusion';
import { TextureFiltering } from './texture';
import { Bounds, RGB } from './util';
import { Vector3 } from './vector';

export interface Voxel {
    position: Vector3;
    colour: RGB;
    collisions: number;

}
export interface VoxelMeshParams {
    desiredHeight: number,
    useMultisampleColouring: boolean,
    textureFiltering: TextureFiltering,
    enableAmbientOcclusion: boolean,
}

export class VoxelMesh {
    private _voxels: Voxel[];
    private _voxelsHash: HashMap<Vector3, number>;
    private _bounds: Bounds;
    private _neighbourMap: Map<string, { value: number }>;
    private _calculateNeighbours: boolean;

    public constructor(calculateNeighbours: boolean = true) {
        this._voxels = [];
        this._voxelsHash = new HashMap(2048);
        this._neighbourMap = new Map();
        this._bounds = Bounds.getInfiniteBounds();
        this._calculateNeighbours = calculateNeighbours;
    }

    public getVoxels() {
        return this._voxels;
    }

    public isVoxelAt(pos: Vector3) {
        return this._voxelsHash.has(pos);
    }

    public getVoxelAt(pos: Vector3) {
        const voxelIndex = this._voxelsHash.get(pos);
        if (voxelIndex !== undefined) {
            return this._voxels[voxelIndex];
        }
    }

    public addVoxel(pos: Vector3, colour: RGB) {
        pos.round();

        const voxelIndex = this._voxelsHash.get(pos);
        if (voxelIndex !== undefined) {
            // A voxel at this position already exists
            const voxel = this._voxels[voxelIndex];
            const voxelColour = voxel.colour.toVector3();
            voxelColour.mulScalar(voxel.collisions);
            ++voxel.collisions;
            voxelColour.add(colour.toVector3());
            voxelColour.divScalar(voxel.collisions);
            voxel.colour = RGB.fromVector3(voxelColour);
        } else {
            // This is a new voxel
            this._voxels.push({
                position: pos,
                colour: colour,
                collisions: 1,
            });
            this._voxelsHash.add(pos, this._voxels.length - 1);
            this._bounds.extendByPoint(pos);
            this._updateNeighbours(pos);
        }
    }

    public getBounds() {
        return this._bounds;
    }

    public getVoxelCount() {
        return this._voxels.length;
    }

    private _neighbours = [
        new Vector3(1, 1, -1),
        new Vector3(0, 1, -1),
        new Vector3(-1, 1, -1),
        new Vector3(1, 0, -1),
        new Vector3(-1, 0, -1),
        new Vector3(1, -1, -1),
        new Vector3(0, -1, -1),
        new Vector3(-1, -1, -1),
        new Vector3(1, 1, 0),
        new Vector3(-1, 1, 0),
        new Vector3(1, -1, 0),
        new Vector3(-1, -1, 0),
        new Vector3(1, 1, 1),
        new Vector3(0, 1, 1),
        new Vector3(-1, 1, 1),
        new Vector3(1, 0, 1),
        new Vector3(-1, 0, 1),
        new Vector3(1, -1, 1),
        new Vector3(0, -1, 1),
        new Vector3(-1, -1, 1),
    ];

    private _updateNeighbours(pos: Vector3) {
        if (this._calculateNeighbours) {
            for (const neighbourOffset of this._neighbours) {
                const neighbour = Vector3.add(pos, neighbourOffset);
                const inverseOffset = neighbourOffset.copy().negate();
                const inverseIndex = OcclusionManager.getNeighbourIndex(inverseOffset);
                // ASSERT(inverseIndex >= 0 && inverseIndex < 27);
                const neighbourData = this.getNeighbours(neighbour);
                neighbourData.value |= (1 << inverseIndex);
                // ASSERT((this.getNeighbours(neighbour).value & (1 << inverseIndex)) !== 0);
            }
        }
    }

    private _stringified: string = '';
    public getNeighbours(pos: Vector3) {
        this._stringified = pos.stringify();
        const neighbours = this._neighbourMap.get(this._stringified);
        if (neighbours === undefined) {
            this._neighbourMap.set(this._stringified, { value: 0 });
            return this._neighbourMap.get(this._stringified)!;
        } else {
            return neighbours;
        }
    }

    public getNeighbourhoodMap() {
        return this._neighbourMap;
    }

    /*
     * Returns true if a voxel at position 'pos' has a neighbour with offset 'offset'
     * Offset must be a vector that exists within this._neighbours defined above
     */
    public hasNeighbour(pos: Vector3, offset: Vector3): boolean {
        return (this.getNeighbours(pos).value & (1 << OcclusionManager.getNeighbourIndex(offset))) > 0;
    }

    // //////////////////////////////////////////////////////////////////////////

    public createBuffer(enableAmbientOcclusion: boolean) {
        const numVoxels = this._voxels.length;
        const newBuffer = {
            position: {
                numComponents: AppConstants.ComponentSize.POSITION,
                data: new Float32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.POSITION),
            },
            colour: {
                numComponents: AppConstants.ComponentSize.COLOUR,
                data: new Float32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.COLOUR),
            },
            occlusion: {
                numComponents: AppConstants.ComponentSize.OCCLUSION,
                data: new Float32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.OCCLUSION).fill(1.0),
            },
            texcoord: {
                numComponents: AppConstants.ComponentSize.TEXCOORD,
                data: new Float32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.TEXCOORD),
            },
            normal: {
                numComponents: AppConstants.ComponentSize.NORMAL,
                data: new Float32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.NORMAL),
            },
            indices: {
                numComponents: AppConstants.ComponentSize.INDICES,
                data: new Uint32Array(numVoxels * AppConstants.VoxelMeshBufferComponentOffsets.INDICES),
            },
        };

        const cube: AttributeData = GeometryTemplates.getBoxBufferData(new Vector3(0, 0, 0));
        for (let i = 0; i < numVoxels; ++i) {
            const voxel = this._voxels[i];
            const voxelColourArray = voxel.colour.toArray();
            const voxelPositionArray = voxel.position.toArray();

            for (let j = 0; j < AppConstants.VoxelMeshBufferComponentOffsets.POSITION; ++j) {
                newBuffer.position.data[i * AppConstants.VoxelMeshBufferComponentOffsets.POSITION + j] = cube.custom.position[j] + voxelPositionArray[j % 3];
            }

            for (let j = 0; j < AppConstants.VoxelMeshBufferComponentOffsets.COLOUR; ++j) {
                newBuffer.colour.data[i * AppConstants.VoxelMeshBufferComponentOffsets.COLOUR + j] = voxelColourArray[j % 3];
            }

            for (let j = 0; j < AppConstants.VoxelMeshBufferComponentOffsets.NORMAL; ++j) {
                newBuffer.normal.data[i * AppConstants.VoxelMeshBufferComponentOffsets.NORMAL + j] = cube.custom.normal[j];
            }

            for (let j = 0; j < AppConstants.VoxelMeshBufferComponentOffsets.TEXCOORD; ++j) {
                newBuffer.texcoord.data[i * AppConstants.VoxelMeshBufferComponentOffsets.TEXCOORD + j] = cube.custom.texcoord[j];
            }

            for (let j = 0; j < AppConstants.VoxelMeshBufferComponentOffsets.INDICES; ++j) {
                newBuffer.indices.data[i * AppConstants.VoxelMeshBufferComponentOffsets.INDICES + j] = cube.indices[j] + (i * AppConstants.INDICES_PER_VOXEL);
            }

            if (enableAmbientOcclusion) {
                const voxelOcclusionArray = OcclusionManager.Get.getOcclusions(voxel.position, this);
                for (let j = 0; j < AppConstants.VoxelMeshBufferComponentOffsets.OCCLUSION; ++j) {
                    newBuffer.occlusion.data[i * AppConstants.VoxelMeshBufferComponentOffsets.OCCLUSION + j] = voxelOcclusionArray[j];
                }
            }
        }

        return newBuffer;
    }
}
