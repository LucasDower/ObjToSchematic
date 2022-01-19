import { Vector3 } from './vector.js';
import { HashMap } from './hash_map';
import { Texture } from './texture';
import { BlockAtlas, BlockInfo, FaceInfo } from './block_atlas';
import { RGB, getAverageColour } from './util';
import { Triangle } from './triangle';
import { Mesh, MaterialType } from './mesh';
import { triangleArea } from './math';
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
    public min = new Vector3( Infinity,  Infinity,  Infinity);
    public max = new Vector3(-Infinity, -Infinity, -Infinity);

    private _voxelsHash: HashMap<Vector3, Block>;
    private _blockMode!: MaterialType;
    private _currentTexture!: Texture;
    private _currentColour!: RGB;

    private static _instance: VoxelManager;

    public static get Get() {
        return this._instance || (this._instance = new this(1.0));
    }

    private constructor(voxelSize: number) {
        this.voxelSize = voxelSize;
        this.voxels = [];
        this.voxelTexcoords = [];

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

        this.min = new Vector3( Infinity,  Infinity,  Infinity);
        this.max = new Vector3(-Infinity, -Infinity, -Infinity);

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

    public assignBlocks() {
        this.blockPalette = [];
        this.voxelTexcoords = [];
        let meanSquaredError = 0.0;

        for (let i = 0; i < this.voxels.length; ++i) {
            const voxel = this.voxels[i];

            const averageColour = getAverageColour(voxel.colours!);

            const ditheringEnabled = AppContext.Get.dithering;
            const blockAssigner = ditheringEnabled ? new OrderedDitheringBlockAssigner() : new BasicBlockAssigner();
            const block = blockAssigner.assignBlock(averageColour, voxel.position);

            const squaredError = Math.pow(255 * (block.colour.r - averageColour.r), 2) + Math.pow(255 * (block.colour.g - averageColour.g), 2) + Math.pow(255 * (block.colour.b - averageColour.b), 2);
            meanSquaredError += squaredError;

            this._assignBlock(i, block);
        }

        meanSquaredError /= this.voxels.length;
        console.log('Mean Squared Error:', meanSquaredError);
    }

    public assignBlankBlocks() {
        this.blockPalette = [];

        const whiteColour = { r: 1.0, g: 1.0, b: 1.0 };
        const block = new BasicBlockAssigner().assignBlock(whiteColour, new Vector3(0, 0, 0));

        for (let i = 0; i < this.voxels.length; ++i) {
            this._assignBlock(i, block);
        }
    }

    public addVoxel(pos: Vector3, block: BlockInfo) {
        // Is there already a voxel in this position?
        let voxel = this._voxelsHash.get(pos);
        if (voxel !== undefined) {
            voxel.colours!.push(block.colour);
        } else {
            voxel = {position: pos, colours: [block.colour]};
            this.voxels.push(voxel);
            this._voxelsHash.add(pos, voxel);
        }

        this.min = Vector3.min(this.min, pos);
        this.max = Vector3.max(this.max, pos);
    }

    private _getVoxelColour(triangle: Triangle, centre: Vector3): RGB {
        if (this._blockMode === MaterialType.Fill) {
            return this._currentColour;
        }

        // TODO: Could cache dist values
        const dist01 = Vector3.sub(triangle.v0.position, triangle.v1.position).magnitude();
        const dist12 = Vector3.sub(triangle.v1.position, triangle.v2.position).magnitude();
        const dist20 = Vector3.sub(triangle.v2.position, triangle.v0.position).magnitude();

        const k0 = Vector3.sub(triangle.v0.position, centre).magnitude();
        const k1 = Vector3.sub(triangle.v1.position, centre).magnitude();
        const k2 = Vector3.sub(triangle.v2.position, centre).magnitude();

        const area01 = triangleArea(dist01, k0, k1);
        const area12 = triangleArea(dist12, k1, k2);
        const area20 = triangleArea(dist20, k2, k0);
        const total = area01 + area12 + area20;

        const w0 = area12 / total;
        const w1 = area20 / total;
        const w2 = area01 / total;

        const uv = {
            u: triangle.v0.texcoord.u * w0 + triangle.v1.texcoord.u * w1 + triangle.v2.texcoord.u * w2,
            v: triangle.v0.texcoord.v * w0 + triangle.v1.texcoord.v * w1 + triangle.v2.texcoord.v * w2,
        };

        return this._currentTexture.getRGBA(uv);
    }

    public voxeliseTriangle(triangle: Triangle) {
        const voxelSize = VoxelManager.Get.voxelSize;
        const v0Scaled = Vector3.divScalar(triangle.v0.position, voxelSize);
        const v1Scaled = Vector3.divScalar(triangle.v1.position, voxelSize);
        const v2Scaled = Vector3.divScalar(triangle.v2.position, voxelSize);

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

                const voxelColour = this._getVoxelColour(triangle, Vector3.mulScalar(voxelPosition, voxelSize));
                const block = BlockAtlas.Get.getBlock(voxelColour);

                this.addVoxel(voxelPosition, block);
            }
        });
    }

    public paintMesh() {
        this.assignBlocks();
    }

    voxeliseMesh(mesh: Mesh) {
        this._clearVoxels();

        mesh.materials.forEach((material) => {
            // Setup material
            if (material.materialData?.type === MaterialType.Texture) {
                this._blockMode = MaterialType.Texture;
                this._currentTexture = new Texture(material.materialData.texturePath, material.materialData.format);
            } else {
                this._currentColour = material.materialData!.diffuseColour;
                this._blockMode = MaterialType.Fill;
            }
            // Handle triangles
            material.faces.forEach((face) => {
                this.voxeliseTriangle(face);
            });
        });

        this.assignBlankBlocks();
    }
}
