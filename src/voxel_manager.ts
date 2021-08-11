import { AABB, CubeAABB } from "./aabb";
import { Vector3 }  from "./vector.js";
import { HashSet, HashMap }  from "./hash_map";
import { Texture } from "./texture";
import { BlockAtlas }  from "./block_atlas";
import { UV, RGB } from "./util";
import { Triangle } from "./triangle";
import { Mesh, MaterialType } from "./mesh";


interface TriangleCubeAABBs {
    triangle: Triangle;
    AABBs: Array<CubeAABB>;
}

export class VoxelManager {

    public voxels: Array<Vector3>;
    public voxelTexcoords: Array<UV>;
    public triangleAABBs: Array<TriangleCubeAABBs>;
    public _voxelSize: number;
    
    private voxelsHash: HashSet<Vector3>;
    private blockAtlas: BlockAtlas;
    private _blockMode!: MaterialType;
    private _currentTexture!: Texture;
    private _currentColour!: RGB;
    
    public minX = Infinity; public maxX = -Infinity;
    public minY = Infinity; public maxY = -Infinity;
    public minZ = Infinity; public maxZ = -Infinity;  

    constructor(voxelSize: number) {
        this._voxelSize = voxelSize;
        this.voxels = [];
        this.voxelTexcoords = [];
        this.triangleAABBs = [];

        this.voxelsHash = new HashSet(2048);
        this.blockAtlas = new BlockAtlas();
    }

    public setVoxelSize(voxelSize: number) {
        this._voxelSize = voxelSize;
    }

    private _clearVoxels() {
        this.voxels = [];
        this.voxelTexcoords = [];
        
        this.minX = Infinity;
        this.minY = Infinity;
        this.minZ = Infinity;
        this.maxX = -Infinity;
        this.maxY = -Infinity;
        this.maxZ = -Infinity;

        this.voxelsHash = new HashSet(2048);
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
        return this.voxelsHash.contains(pos);
    } 

    addVoxel(vec: Vector3, blockTexcoord: UV) {

        // (0.5, 0.5, 0.5) -> (0, 0, 0);
        vec = Vector3.subScalar(vec, this._voxelSize / 2);

        // [HACK] FIXME: Fix misaligned voxels
        // Some vec data is not not grid-snapped to voxelSize-spacing
        const test = Vector3.divScalar(vec, this._voxelSize);
        if ((test.x % 1 < 0.9 && test.x % 1 > 0.1) || (test.y % 1 < 0.9 && test.y % 1 > 0.1) || (test.z % 1 < 0.9 && test.z % 1 > 0.1)) {
            console.warn("Misaligned voxel, skipping...");
            return;
        }

        // Convert to 
        const pos = this._toGridPosition(vec);
        if (this.voxelsHash.contains(pos)) {
            return;
        }
        this.voxels.push(pos);
        this.voxelTexcoords.push(blockTexcoord);
        this.voxelsHash.add(pos);

        this.minX = Math.min(this.minX, vec.x);
        this.minY = Math.min(this.minY, vec.y);
        this.minZ = Math.min(this.minZ, vec.z);
        this.maxX = Math.max(this.maxX, vec.x);
        this.maxY = Math.max(this.maxY, vec.y);
        this.maxZ = Math.max(this.maxZ, vec.z);
    }

    // FIXME: Fix voxel meshing for AO and textures
    /*
    _findXExtent(pos) {
        let xEnd = pos.x + 1;

        while (this.voxelsHash.contains(new Vector3(xEnd, pos.y, pos.z)) && !this.seen.contains(new Vector3(xEnd, pos.y, pos.z))) {
            //console.log("Marking:", new Vector3(xEnd, y, z));
            this.seen.add(new Vector3(xEnd, pos.y, pos.z));
            ++xEnd;
        }

        return xEnd - 1;
    }

    _findZExtent(pos, xEnd) {
        let canMerge = true;
        let zEnd = pos.z + 1;

        do {
            //console.log("zEnd:", z, zEnd);
            for (let i = pos.x; i <= xEnd; ++i) {
                const here = new Vector3(i, pos.y, zEnd);
                if (!this.voxelsHash.contains(here) || this.seen.contains(here)) {
                    canMerge = false;
                    break;
                }
            }
            if (canMerge) {
                // Mark all as seen
                for (let i = pos.x; i <= xEnd; ++i) {
                    const here = new Vector3(i, pos.y, zEnd);
                    //console.log("Marking:", new Vector3(xEnd, y, z));
                    this.seen.add(here);
                }
                ++zEnd;
            }
        } while (canMerge);

        return zEnd - 1;
    }

    _findYExtent(pos, xEnd, zEnd) {
        let canMerge = true;
        let yEnd = pos.y + 1;

        do {
            for (let i = pos.x; i <= xEnd; ++i) {
                for (let j = pos.z; j <= zEnd; ++j) {
                    const here = new Vector3(i, yEnd, j);
                    if (!this.voxelsHash.contains(here) || this.seen.contains(here)) {
                        canMerge = false;
                        break;
                    }
                }
            }

            if (canMerge) {
                // Mark all as seen
                for (let i = pos.x; i <= xEnd; ++i) {
                    for (let j = pos.z; j <= zEnd; ++j) {
                        const here = new Vector3(i, yEnd, j);
                        this.seen.add(here);
                    }
                }
                ++yEnd;
            }
        } while (canMerge);

        return yEnd - 1;
    }

    buildMesh() {

        this.mesh = [];
        this.seen = new HashSet(2048);
        //console.log(this.voxelsHash);

        const minPos = this._toGridPosition(new Vector3(this.minX, this.minY, this.minZ));
        const maxPos = this._toGridPosition(new Vector3(this.maxX, this.maxY, this.maxZ));

        for (let y = minPos.y; y <= maxPos.y; ++y) {
            for (let z = minPos.z; z <= maxPos.z; ++z) {
                for (let x = minPos.x; x <= maxPos.x; ++x) {
                    
                    const pos = new Vector3(x, y, z);

                    if (this.seen.contains(pos) || !this.voxelsHash.contains(pos)) {
                        continue;
                    }

                    let xEnd = this._findXExtent(pos);
                    let zEnd = this._findZExtent(pos, xEnd);
                    let yEnd = this._findYExtent(pos, xEnd, zEnd);

                    let centre = new Vector3((xEnd + x)/2, (yEnd + y)/2, (zEnd + z)/2);
                    let size = new Vector3(xEnd - x + 1, yEnd - y + 1, zEnd - z + 1);

                    this.mesh.push({
                        centre: this._toModelPosition(centre),
                        size: this._toModelPosition(size)
                    });
                }
            }
        }

        //console.log("Mesh:", this.mesh);

        return this.mesh;
    }
    */

    public splitVoxels() {
        this._voxelSize /= 2;
        this._clearVoxels();
        
        const newTriangleAABBs = [];

        for (const {triangle, AABBs} of this.triangleAABBs) {
            const triangleAABBs = [];
            for (const AABB of AABBs) {
                for (const sub of AABB.subdivide()) {
                    if (triangle.intersectAABB(sub)) {
                        const voxelColour = this._getVoxelColour(triangle, sub.centre);
                        const blockTexcoord = this.blockAtlas.getTexcoord(voxelColour);

                        this.addVoxel(sub.centre, blockTexcoord);
                        triangleAABBs.push(sub);
                    }
                }
            }
            newTriangleAABBs.push({triangle: triangle, AABBs: triangleAABBs});
        }

        this.triangleAABBs = newTriangleAABBs;
    }

    _getVoxelColour(triangle: Triangle, centre: Vector3): RGB {
        const p1 = triangle.v0;
        const p2 = triangle.v1;
        const p3 = triangle.v2;

        const uv1 = triangle.uv0;
        const uv2 = triangle.uv1;
        const uv3 = triangle.uv2;

        const f1 = Vector3.sub(p1, centre);
        const f2 = Vector3.sub(p2, centre);
        const f3 = Vector3.sub(p3, centre);

        const a  = Vector3.cross(Vector3.sub(p1, p2), Vector3.sub(p1, p3)).magnitude();
        const a1 = Vector3.cross(f2, f3).magnitude() / a;
        const a2 = Vector3.cross(f3, f1).magnitude() / a;
        const a3 = Vector3.cross(f1, f2).magnitude() / a;

        const uv = {
            u: uv1.u * a1 + uv2.u * a2 + uv3.u * a3,
            v: uv1.v * a1 + uv2.v * a2 + uv3.v * a3
        }

        if (this._blockMode === MaterialType.Texture) {
            return this._currentTexture.getRGBA(uv);
        } else {
            return this._currentColour;
        }
    }

    voxeliseTriangle(triangle: Triangle) {
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
                    const blockTexcoord = this.blockAtlas.getTexcoord(voxelColour);

                    this.addVoxel(aabb.centre, blockTexcoord);
                    triangleAABBs.push(aabb);
                }
            }        
        }

        this.triangleAABBs.push({triangle: triangle, AABBs: triangleAABBs});
    }

    voxeliseMesh(mesh: Mesh) {
        for (const materialName in mesh.materialTriangles) {
            const materialTriangles = mesh.materialTriangles[materialName];
            // Setup material
            if (materialTriangles.material.type === MaterialType.Texture) {
                this._currentTexture = new Texture(materialTriangles.material.texturePath);
                this._blockMode = MaterialType.Texture;
            } else {
                this._currentColour = materialTriangles.material.diffuseColour;
                this._blockMode = MaterialType.Fill;
            }
            // Handle triangles
            for (const triangle of materialTriangles.triangles) {
                this.voxeliseTriangle(triangle);
            }
        }
    }

}