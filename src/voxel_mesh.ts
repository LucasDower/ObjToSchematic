import { RenderBuffer, VoxelData } from './buffer';
import { AppConfig } from './config';
import { GeometryTemplates } from './geometry';
import { HashMap } from './hash_map';
import { MaterialType, Mesh, SolidMaterial, TexturedMaterial } from './mesh';
import { OcclusionManager } from './occlusion';
import { Axes, generateRays, rayIntersectTriangle } from './ray';
import { Texture, TextureFiltering } from './texture';
import { Triangle, UVTriangle } from './triangle';
import { UI } from './ui/layout';
import { Bounds, LOG, RGB, UV } from './util';
import { Vector3 } from './vector';

export interface Voxel {
    position: Vector3;
    colour: RGB;
    collisions: number;
}

export class VoxelMesh {
    private _voxelSize: number;
    private _voxels: Voxel[];
    private _voxelsHash: HashMap<Vector3, number>;
    private _loadedTextures: { [materialName: string]: Texture };
    private _bounds: Bounds;

    public constructor() {
        LOG('New voxel mesh');

        const desiredHeight = UI.Get.layout.build.elements.height.getCachedValue() as number;
        this._voxelSize = 8.0 / Math.round(desiredHeight);
        this._voxels = [];
        this._voxelsHash = new HashMap(2048);
        this._loadedTextures = {};
        this._bounds = Bounds.getInfiniteBounds();
    }

    public getVoxels() {
        return this._voxels;
    }

    public isVoxelAt(pos: Vector3) {
        return this._voxelsHash.has(pos);
    }

    public voxelise(mesh: Mesh) {
        LOG('Voxelising');

        mesh.tris.forEach((tri, index) => {
            const material = mesh.materials[tri.material];
            if (material.type == MaterialType.textured) {
                if (!(tri.material in this._loadedTextures)) {
                    this._loadedTextures[tri.material] = new Texture(material.path);
                }
            }
            const uvTriangle = mesh.getUVTriangle(index);
            this._voxeliseTri(uvTriangle, material, tri.material);
        });
    }

    private _voxeliseTri(triangle: UVTriangle, material: (SolidMaterial | TexturedMaterial), materialName: string) {
        const v0Scaled = Vector3.divScalar(triangle.v0, this._voxelSize);
        const v1Scaled = Vector3.divScalar(triangle.v1, this._voxelSize);
        const v2Scaled = Vector3.divScalar(triangle.v2, this._voxelSize);
        const rayList = generateRays(v0Scaled, v1Scaled, v2Scaled);

        rayList.forEach((ray) => {
            const intersection = rayIntersectTriangle(ray, v0Scaled, v1Scaled, v2Scaled);
            if (intersection) {
                let voxelPosition: Vector3;
                switch (ray.axis) {
                case Axes.x:
                    voxelPosition = new Vector3(Math.round(intersection.x), intersection.y, intersection.z);
                    break;
                case Axes.y:
                    voxelPosition = new Vector3(intersection.x, Math.round(intersection.y), intersection.z);
                    break;
                case Axes.z:
                    voxelPosition = new Vector3(intersection.x, intersection.y, Math.round(intersection.z));
                    break;
                }

                let voxelColour: RGB;
                const useMultisampleColouring = UI.Get.layout.build.elements.multisampleColouring.getCachedValue() as string === 'on';
                if (useMultisampleColouring && material.type === MaterialType.textured) {
                    const samples: RGB[] = [];
                    for (let i = 0; i < AppConfig.MULTISAMPLE_COUNT; ++i) {
                        const samplePosition = Vector3.mulScalar(Vector3.add(voxelPosition, Vector3.random().addScalar(-0.5)), this._voxelSize);
                        samples.push(this._getVoxelColour(triangle, material, materialName, samplePosition));
                    }
                    voxelColour = RGB.averageFrom(samples);
                } else {
                    voxelColour = this._getVoxelColour(triangle, material, materialName, Vector3.mulScalar(voxelPosition, this._voxelSize));
                }
                this._addVoxel(voxelPosition, voxelColour);
            }
        });
    }

    private _getVoxelColour(triangle: UVTriangle, material: (SolidMaterial | TexturedMaterial), materialName: string, location: Vector3): RGB {
        if (material.type == MaterialType.solid) {
            return material.colour;
        }

        const area01 = new Triangle(triangle.v0, triangle.v1, location).getArea();
        const area12 = new Triangle(triangle.v1, triangle.v2, location).getArea();
        const area20 = new Triangle(triangle.v2, triangle.v0, location).getArea();
        const total = area01 + area12 + area20;

        const w0 = area12 / total;
        const w1 = area20 / total;
        const w2 = area01 / total;

        const uv = new UV(
            triangle.uv0.u * w0 + triangle.uv1.u * w1 + triangle.uv2.u * w2,
            triangle.uv0.v * w0 + triangle.uv1.v * w1 + triangle.uv2.v * w2,
        );
            
        const filtering = UI.Get.layout.build.elements.textureFiltering.getCachedValue() as string === 'linear' ? TextureFiltering.Linear : TextureFiltering.Nearest;
        return this._loadedTextures[materialName].getRGB(uv, filtering);
    }

    private _addVoxel(pos: Vector3, colour: RGB) {
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

    public createBuffer() {
        const buffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 3 },
            { name: 'occlusion', numComponents: 4 },
            { name: 'texcoord', numComponents: 2 },
            { name: 'normal', numComponents: 3 },
        ]);

        const ambientOcclusionEnabled = UI.Get.layout.build.elements.ambientOcclusion.getCachedValue() as string === 'on';
        for (const voxel of this._voxels) {
            // Each vertex of a face needs the occlusion data for the other 3 vertices
            // in it's face, not just itself. Also flatten occlusion data.
            let occlusions: number[];
            if (ambientOcclusionEnabled) {
                occlusions = OcclusionManager.Get.getOcclusions(voxel.position, this);
            } else {
                occlusions = OcclusionManager.Get.getBlankOcclusions();
            }

            const data: VoxelData = GeometryTemplates.getBoxBufferData(voxel.position);
            data.custom.occlusion = occlusions;

            data.custom.colour = [];
            for (let i = 0; i < 24; ++i) {
                data.custom.colour.push(voxel.colour.r, voxel.colour.g, voxel.colour.b);
            }

            const faceNormals = OcclusionManager.Get.getFaceNormals();
            if (AppConfig.FACE_CULLING) {
                // TODO: Optmise, enabling FACE_CULLING is slower than not bothering
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
