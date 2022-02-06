import { Vector3 } from './vector.js';
import { HashMap } from './hash_map';
import { Texture } from './texture';
import { BlockInfo, FaceInfo } from './block_atlas';
import { Bounds, UV, RGB } from './util';
import { Triangle, UVTriangle } from './triangle';
import { MaterialType, SolidMaterial, TexturedMaterial } from './mesh';
import { Axes, generateRays, rayIntersectTriangle } from './ray';
import { BasicBlockAssigner, OrderedDitheringBlockAssigner } from './block_assigner.js';
import { AppContext } from './app_context.js';

interface Block {
    position: Vector3;
    colours?: Array<RGB>;
    colour?: RGB;
    block?: string
}
export class VoxelManager {
    public voxels: Array<Block>;
    public voxelTexcoords: Array<FaceInfo>;
    public voxelSize: number;
    public blockPalette: Array<string>;
    public bounds: Bounds;
    public ambientOcclusionEnabled = true;

    private _voxelsHash: HashMap<Vector3, Block>;
    private _loadedTextures: { [materialName: string]: Texture };

    private static _instance: VoxelManager;

    public static get Get() {
        return this._instance || (this._instance = new this(1.0));
    }

    private constructor(voxelSize: number) {
        this.voxelSize = voxelSize;
        this.voxels = [];
        this.voxelTexcoords = [];
        this._loadedTextures = {};
        this.bounds = Bounds.getInfiniteBounds();

        this._voxelsHash = new HashMap(2048);
        this.blockPalette = [];
    }

    public setDesiredHeight(desiredHeight: number) {
        this.voxelSize = 8.0 / Math.round(desiredHeight);
    }

    private _clearVoxels() {
        this.voxels = [];
        this.voxelTexcoords = [];
        this.blockPalette = [];
        this._loadedTextures = {};
        this.bounds = Bounds.getInfiniteBounds();

        this._voxelsHash = new HashMap(2048);
    }

    public isVoxelAt(pos: Vector3) {
        return this._voxelsHash.has(pos);
    }

    private _assignBlock(voxelIndex: number, block: BlockInfo) {
        this.voxels[voxelIndex].block = block.name;
        this.voxelTexcoords.push(block.faces);

        if (!this.blockPalette.includes(block.name)) {
            this.blockPalette.push(block.name);
        }
    }

    public assignBlocks(ditheringEnabled: boolean) {
        this.blockPalette = [];
        this.voxelTexcoords = [];

        for (let i = 0; i < this.voxels.length; ++i) {
            const voxel = this.voxels[i];

            const averageColour = RGB.averageFrom(voxel.colours!);
            const blockAssigner = ditheringEnabled ? new OrderedDitheringBlockAssigner() : new BasicBlockAssigner();
            const block = blockAssigner.assignBlock(averageColour, voxel.position);

            this._assignBlock(i, block);
        }
    }

    public assignBlankBlocks() {
        this.blockPalette = [];

        const block = new BasicBlockAssigner().assignBlock(RGB.white, new Vector3(0, 0, 0));

        for (let i = 0; i < this.voxels.length; ++i) {
            this._assignBlock(i, block);
        }
    }

    public addVoxel(pos: Vector3, colour: RGB) {
        // Is there already a voxel in this position?
        let voxel = this._voxelsHash.get(pos);
        if (voxel !== undefined) {
            voxel.colours!.push(colour);
        } else {
            voxel = {position: pos, colours: [colour]};
            this.voxels.push(voxel);
            this._voxelsHash.add(pos, voxel);
        }
        this.bounds.extendByPoint(pos);
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

        return this._loadedTextures[materialName].getRGB(uv);
    }

    public voxeliseTriangle(triangle: UVTriangle, material: (SolidMaterial | TexturedMaterial), materialName: string) {
        const voxelSize = VoxelManager.Get.voxelSize;

        const v0Scaled = Vector3.divScalar(triangle.v0, voxelSize);
        const v1Scaled = Vector3.divScalar(triangle.v1, voxelSize);
        const v2Scaled = Vector3.divScalar(triangle.v2, voxelSize);

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

                const voxelColour = this._getVoxelColour(triangle, material, materialName, Vector3.mulScalar(voxelPosition, voxelSize));
                this.addVoxel(voxelPosition, voxelColour);
            }
        });
    }

    public voxeliseMesh(desiredHeight: number, ambientOcclusion: boolean) {
        this.ambientOcclusionEnabled = ambientOcclusion;

        this.setDesiredHeight(desiredHeight);

        this._clearVoxels();

        const mesh = AppContext.Get.loadedMesh!;
        mesh.tris.forEach((tri, index) => {
            const material = mesh.materials[tri.material];
            if (material.type == MaterialType.textured) {
                if (!(tri.material in this._loadedTextures)) {
                    this._loadedTextures[tri.material] = new Texture(material.path);
                }
            }
            const uvTriangle = mesh.getUVTriangle(index);
            this.voxeliseTriangle(uvTriangle, material, tri.material);
        });
    }
}
