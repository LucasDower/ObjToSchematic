import { CubeAABB } from "./aabb";
import { Vector3 }  from "./vector.js";
import { HashMap }  from "./hash_map";
import { Texture } from "./texture";
import { BlockAtlas, BlockInfo, FaceInfo }  from "./block_atlas";
import { RGB } from "./util";
import { Triangle } from "./triangle";
import { Mesh, MaterialType } from "./mesh";
import { triangleArea } from "./math";

interface Block {
    position: Vector3;
    colours?: Array<RGB>;
    colour?: RGB;
    block?: string
}

interface TriangleCubeAABBs {
    triangle: Triangle;
    AABBs: Array<CubeAABB>;
}

export class VoxelManager {

    public voxels: Array<Block>;
    public voxelTexcoords: Array<FaceInfo>;
    public triangleAABBs: Array<TriangleCubeAABBs>;
    public _voxelSize: number;
    
    private voxelsHash: HashMap<Vector3, Block>;
    public blockAtlas: BlockAtlas;
    private _blockMode!: MaterialType;
    private _currentTexture!: Texture;
    private _currentColour!: RGB;
    public blockPalette: Array<string>;
    
    public min = new Vector3( Infinity,  Infinity,  Infinity);
    public max = new Vector3(-Infinity, -Infinity, -Infinity);

    private static _instance: VoxelManager;

    public static get Get() {
        return this._instance || (this._instance = new this(1.0));
    }

    private constructor(voxelSize: number) {
        this._voxelSize = voxelSize;
        this.voxels = [];
        this.voxelTexcoords = [];
        this.triangleAABBs = [];

        this.voxelsHash = new HashMap(2048);
        this.blockAtlas = new BlockAtlas();
        this.blockPalette = [];
    }

    public setVoxelSize(voxelSize: number) {
        this._voxelSize = voxelSize;
    }

    private _clearVoxels() {
        this.voxels = [];
        this.voxelTexcoords = [];
        this.blockPalette = []
        
        this.min = new Vector3( Infinity,  Infinity,  Infinity);
        this.max = new Vector3(-Infinity, -Infinity, -Infinity);

        this.voxelsHash = new HashMap(2048);
    }

    public clear() {
        this.triangleAABBs = [];
        this._clearVoxels();
    }

    private _snapToVoxelGrid(vec: Vector3) {
        return vec.copy().divScalar(this._voxelSize).round().mulScalar(this._voxelSize);
    }

    private _getTriangleCubeAABB(triangle: Triangle) {
        const triangleAABB = triangle.getAABB();
        const gridSnappedCentre = this._snapToVoxelGrid(triangleAABB.centre);

        let cubeAABB = new CubeAABB(gridSnappedCentre, this._voxelSize);
        while (!triangle.insideAABB(cubeAABB)) {
            cubeAABB = new CubeAABB(cubeAABB.centre, cubeAABB.width * 2.0);
        }

        return cubeAABB;
    }

    private _toGridPosition(vec: Vector3) {
        return new Vector3(
            Math.round(vec.x / this._voxelSize),
            Math.round(vec.y / this._voxelSize),
            Math.round(vec.z / this._voxelSize)
        );
    }

    private _toModelPosition(vec: Vector3) {
        return new Vector3(
            vec.x * this._voxelSize,
            vec.y * this._voxelSize,
            vec.z * this._voxelSize
        );
    }

    public isVoxelAt(pos: Vector3) {
        return this.voxelsHash.get(pos) !== undefined;
    } 

    public assignBlocks() {
        this.blockPalette = [];
        let meanSquaredError = 0.0;

        for (let i = 0; i < this.voxels.length; ++i) {
            let averageColour = this.voxels[i].colours!.reduce((a, c) => {return {r: a.r + c.r, g: a.g + c.g, b: a.b + c.b}})
            let n = this.voxels[i].colours!.length;
            averageColour.r /= n;
            averageColour.g /= n;
            averageColour.b /= n;
            const block = this.blockAtlas.getBlock(averageColour);

            const squaredError = Math.pow(255 * (block.colour.r - averageColour.r), 2) + Math.pow(255 * (block.colour.g - averageColour.g), 2) + Math.pow(255 * (block.colour.b - averageColour.b), 2);
            meanSquaredError += squaredError;

            this.voxels[i].block = block.name;
            this.voxelTexcoords.push(block.faces);


            if (!this.blockPalette.includes(block.name)) {
                this.blockPalette.push(block.name);
            }
        }

        meanSquaredError /= this.voxels.length;
        console.log("Mean Squared Error:", meanSquaredError);

    }

    public addVoxel(vec: Vector3, block: BlockInfo) {

        // (0.5, 0.5, 0.5) -> (0, 0, 0);
        vec = Vector3.subScalar(vec, this._voxelSize / 2);
        const pos = this._toGridPosition(vec);

        // [HACK] FIXME: Fix misaligned voxels
        // Some vec data is not not grid-snapped to voxelSize-spacing
        const test = Vector3.divScalar(vec, this._voxelSize);
        if ((test.x % 1 < 0.9 && test.x % 1 > 0.1) || (test.y % 1 < 0.9 && test.y % 1 > 0.1) || (test.z % 1 < 0.9 && test.z % 1 > 0.1)) {
            console.warn("Misaligned voxel, skipping...");
            return;
        }

        // Is there already a voxel in this position?
        let voxel = this.voxelsHash.get(pos);
        if (voxel !== undefined) { 
            voxel.colours!.push(block.colour);
        } else {
            voxel = {position: pos, colours: [block.colour]};
            this.voxels.push(voxel);
            this.voxelsHash.add(pos, voxel);
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
        }

        return this._currentTexture.getRGBA(uv);
    }

    public voxeliseTriangle(triangle: Triangle) {
        const cubeAABB = this._getTriangleCubeAABB(triangle);

        const triangleAABBs = [];

        let queue = [cubeAABB];
        while (true) {
            const aabb = queue.shift();
            if (!aabb) {
                break;
            }
            if (triangle.intersectAABB(aabb)) {
                if (aabb.width > this._voxelSize) {
                    // Continue to subdivide
                    queue.push(...aabb.subdivide());
                } else {
                    // We've reached the voxel level, stop                    
                    const voxelColour = this._getVoxelColour(triangle, aabb.centre);
                    const block = this.blockAtlas.getBlock(voxelColour);

                    this.addVoxel(aabb.centre, block);
                    triangleAABBs.push(aabb);
                }
            }        
        }

        this.triangleAABBs.push({triangle: triangle, AABBs: triangleAABBs});
    }

    voxeliseMesh(mesh: Mesh) {
        mesh.materials.forEach(material => {
            // Setup material
            console.log("VOXELISING", material.name);

            if (material.materialData?.type === MaterialType.Texture) {
                this._blockMode = MaterialType.Texture;
                this._currentTexture = new Texture(material.materialData.texturePath, material.materialData.format);
            } else {
                this._currentColour = material.materialData!.diffuseColour;
                this._blockMode = MaterialType.Fill;
            }
            // Handle triangles
            material.faces.forEach(face => {
                this.voxeliseTriangle(face);
            });
        });

        this.assignBlocks();
    }

}