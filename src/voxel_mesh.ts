import { RenderBuffer, AttributeData, ComponentSize } from './buffer';
import { GeometryTemplates } from './geometry';
import { HashMap } from './hash_map';
import { Mesh } from './mesh';
import { OcclusionManager } from './occlusion';
import { TextureFiltering } from './texture';
import { Bounds, RGB } from './util';
import { Vector3 } from './vector';

export const FACES_PER_VOXEL = 6;
export const VERTICES_PER_FACE = 4;
const INDICES_PER_VOXEL = 24;
const COMPONENT_PER_SIZE_OFFSET = FACES_PER_VOXEL * VERTICES_PER_FACE;

export namespace VoxelMeshBufferComponentOffsets {
    export const TEXCOORD = ComponentSize.TEXCOORD * COMPONENT_PER_SIZE_OFFSET;
    export const POSITION = ComponentSize.POSITION * COMPONENT_PER_SIZE_OFFSET;
    export const COLOUR = ComponentSize.COLOUR * COMPONENT_PER_SIZE_OFFSET;
    export const NORMAL = ComponentSize.NORMAL * COMPONENT_PER_SIZE_OFFSET;
    export const INDICES = ComponentSize.INDICES * COMPONENT_PER_SIZE_OFFSET;
    export const OCCLUSION = ComponentSize.OCCLUSION * COMPONENT_PER_SIZE_OFFSET;
}

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
                numComponents: ComponentSize.POSITION,
                data: new Float32Array(numVoxels * VoxelMeshBufferComponentOffsets.POSITION),
            },
            colour: {
                numComponents: ComponentSize.COLOUR,
                data: new Float32Array(numVoxels * VoxelMeshBufferComponentOffsets.COLOUR),
            },
            occlusion: {
                numComponents: ComponentSize.OCCLUSION,
                data: new Float32Array(numVoxels * VoxelMeshBufferComponentOffsets.OCCLUSION).fill(1.0),
            },
            texcoord: {
                numComponents: ComponentSize.TEXCOORD,
                data: new Float32Array(numVoxels * VoxelMeshBufferComponentOffsets.TEXCOORD),
            },
            normal: {
                numComponents: ComponentSize.NORMAL,
                data: new Float32Array(numVoxels * VoxelMeshBufferComponentOffsets.NORMAL),
            },
            indices: {
                numComponents: ComponentSize.INDICES,
                data: new Uint32Array(numVoxels * VoxelMeshBufferComponentOffsets.INDICES),
            },
        };

        const cube: AttributeData = GeometryTemplates.getBoxBufferData(new Vector3(0, 0, 0));
        for (let i = 0; i < numVoxels; ++i) {
            const voxel = this._voxels[i];
            const voxelColourArray = voxel.colour.toArray();
            const voxelPositionArray = voxel.position.toArray();
            
            for (let j = 0; j < VoxelMeshBufferComponentOffsets.POSITION; ++j) {
                newBuffer.position.data[i * VoxelMeshBufferComponentOffsets.POSITION + j] = cube.custom.position[j] + voxelPositionArray[j % 3];
            }
            
            for (let j = 0; j < VoxelMeshBufferComponentOffsets.COLOUR; ++j) {
                newBuffer.colour.data[i * VoxelMeshBufferComponentOffsets.COLOUR + j] = voxelColourArray[j % 3];
            }

            for (let j = 0; j < VoxelMeshBufferComponentOffsets.NORMAL; ++j) {
                newBuffer.normal.data[i * VoxelMeshBufferComponentOffsets.NORMAL + j] = cube.custom.normal[j];
            }

            for (let j = 0; j < VoxelMeshBufferComponentOffsets.TEXCOORD; ++j) {
                newBuffer.texcoord.data[i * VoxelMeshBufferComponentOffsets.TEXCOORD + j] = cube.custom.texcoord[j];
            }

            for (let j = 0; j < VoxelMeshBufferComponentOffsets.INDICES; ++j) {
                newBuffer.indices.data[i * VoxelMeshBufferComponentOffsets.INDICES + j] = cube.indices[j] + (i * INDICES_PER_VOXEL);
            }
            
            if (ambientOcclusionEnabled) {
                const voxelOcclusionArray = OcclusionManager.Get.getOcclusions(voxel.position, this);
                for (let j = 0; j < VoxelMeshBufferComponentOffsets.OCCLUSION; ++j) {
                    newBuffer.occlusion.data[i * VoxelMeshBufferComponentOffsets.OCCLUSION + j] = voxelOcclusionArray[j];
                }
            }
        }

        return newBuffer;
    }
}
