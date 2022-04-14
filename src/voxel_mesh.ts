import { RenderBuffer, AttributeData } from './buffer';
import { AppConstants } from './constants';
import { GeometryTemplates } from './geometry';
import { HashMap } from './hash_map';
import { Mesh } from './mesh';
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
}

export class VoxelMesh {
    public debugBuffer: RenderBuffer;

    private _mesh: Mesh;
    private _voxelMeshParams: VoxelMeshParams;

    private _voxelSize: number;
    private _voxels: Voxel[];
    private _voxelsHash: HashMap<Vector3, number>;
    private _bounds: Bounds;

    public constructor(mesh: Mesh, voxelMeshParams: VoxelMeshParams) {
        this.debugBuffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 3 },
        ]);

        this._mesh = mesh;
        this._voxelMeshParams = voxelMeshParams;

        this._voxelSize = 8.0 / Math.round(voxelMeshParams.desiredHeight);
        this._voxels = [];
        this._voxelsHash = new HashMap(2048);
        this._bounds = Bounds.getInfiniteBounds();
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

    public getMesh() {
        return this._mesh;
    }

    public addVoxel(pos: Vector3, colour: RGB) {
        const voxelIndex = this._voxelsHash.get(pos);
        if (voxelIndex !== undefined) {
            const voxel = this._voxels[voxelIndex];
            const voxelColour = voxel.colour.toVector3();
            voxelColour.mulScalar(voxel.collisions);
            ++voxel.collisions;
            voxelColour.add(colour.toVector3());
            voxelColour.divScalar(voxel.collisions);
            voxel.colour = RGB.fromVector3(voxelColour);
        } else {
            this._voxels.push({
                position: pos,
                colour: colour,
                collisions: 1,
            });
            this._voxelsHash.add(pos, this._voxels.length - 1);
            this._bounds.extendByPoint(pos);
        }
    }

    public getVoxelSize() {
        return this._voxelSize;
    }

    public getBounds() {
        return this._bounds;
    }

    public getVoxelCount() {
        return this._voxels.length;
    }

    // //////////////////////////////////////////////////////////////////////////

    public createBuffer(ambientOcclusionEnabled: boolean) {
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
            
            if (ambientOcclusionEnabled) {
                const voxelOcclusionArray = OcclusionManager.Get.getOcclusions(voxel.position, this);
                for (let j = 0; j < AppConstants.VoxelMeshBufferComponentOffsets.OCCLUSION; ++j) {
                    newBuffer.occlusion.data[i * AppConstants.VoxelMeshBufferComponentOffsets.OCCLUSION + j] = voxelOcclusionArray[j];
                }
            }
        }

        return newBuffer;
    }
}
