import { RenderBuffer, AttributeData } from './buffer';
import { AppConfig } from './config';
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

    // //////////////////////////////////////////////////////////////////////////

    public createBuffer(ambientOcclusionEnabled: boolean) {
        const buffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 3 },
            { name: 'occlusion', numComponents: 4 },
            { name: 'texcoord', numComponents: 2 },
            { name: 'normal', numComponents: 3 },
        ]);

        for (const voxel of this._voxels) {
            // Each vertex of a face needs the occlusion data for the other 3 vertices
            // in it's face, not just itself. Also flatten occlusion data.
            let occlusions: number[];
            if (ambientOcclusionEnabled) {
                occlusions = OcclusionManager.Get.getOcclusions(voxel.position, this);
            } else {
                occlusions = OcclusionManager.Get.getBlankOcclusions();
            }

            const data: AttributeData = GeometryTemplates.getBoxBufferData(voxel.position);
            data.custom.occlusion = occlusions;

            data.custom.colour = [];
            for (let i = 0; i < 24; ++i) {
                data.custom.colour.push(voxel.colour.r, voxel.colour.g, voxel.colour.b);
            }

            const faceNormals = OcclusionManager.Get.getFaceNormals();
            if (AppConfig.FACE_CULLING) {
                // TODO: Optimise, enabling FACE_CULLING is slower than not bothering
                for (let i = 0; i < 6; ++i) {
                    if (!this.isVoxelAt(Vector3.add(voxel.position, faceNormals[i]))) {
                        buffer.add({
                            custom: {
                                position: data.custom.position.slice(i * 12, (i+1) * 12),
                                occlusion: data.custom.occlusion.slice(i * 16, (i+1) * 16),
                                normal: data.custom.normal.slice(i * 12, (i+1) * 12),
                                texcoord: data.custom.texcoord.slice(i * 8, (i+1) * 8),
                                colour: data.custom.colour.slice(i * 12, (i+1) * 12),
                            },
                            indices: data.indices.slice(0, 6),
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
