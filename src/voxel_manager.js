const { AABB, CubeAABB } = require("./aabb.js");
const { Vector3 } = require("./vector.js");
const { HashSet, HashMap } = require('./hash_map.js');
const { Texture } = require("./texture.js");
const { BlockAtlas } = require("./block_atlas.js");

class VoxelManager {

    constructor(voxelSize) {
        this._voxelSize = voxelSize;
        this.voxels = [];
        this.voxelTexcoords = [];
        this.triangleAABBs = [];
        this.failedAABBs = [];

        this.minX = Infinity; // JavaScript crack
        this.minY = Infinity;
        this.minZ = Infinity;
        this.maxX = -Infinity;
        this.maxY = -Infinity;
        this.maxZ = -Infinity;
        this.voxelsHash = new HashSet(2048);

        this.blockAtlas = new BlockAtlas();
    }

    setVoxelSize(voxelSize) {
        this._voxelSize = voxelSize;
    }

    _clearVoxels() {
        this.voxels = [];
        this.voxelTexcoords = [];
        this.failedAABBs = [];
        
        this.minX = Infinity; // JavaScript crack
        this.minY = Infinity;
        this.minZ = Infinity;
        this.maxX = -Infinity;
        this.maxY = -Infinity;
        this.maxZ = -Infinity;

        this.voxelsHash = new HashSet(2048);
    }

    clear() {
        this.triangleAABBs = [];
        this._clearVoxels();
    }

    _getTriangleCubeAABB(triangle) {
        let gridSnappedCentre = Vector3.divScalar(triangle.aabb.centre, this._voxelSize);
        gridSnappedCentre = Vector3.round(gridSnappedCentre);
        gridSnappedCentre = Vector3.mulScalar(gridSnappedCentre, this._voxelSize);

        let width = this._voxelSize;
        //let cubeAABB = new AABB(gridSnappedCentre, new Vector3(size, size, size));
        let cubeAABB = new CubeAABB(gridSnappedCentre, width);

        while (!triangle.insideAABB(cubeAABB)) {
            //cubeAABB = new AABB(cubeAABB.centre, Vector3.mulScalar(cubeAABB.size, 2.0));
            cubeAABB = new CubeAABB(cubeAABB.centre, cubeAABB.width * 2.0);
        }

        //console.log(cubeAABB.centre);
        return cubeAABB;
    }

    _toGridPosition(vec) {
        //Vector3.round(Vector3.subScalar(Vector3.divScalar(vec, this._voxelSize), 0.5));
        return new Vector3(
            Math.round(vec.x / this._voxelSize),
            Math.round(vec.y / this._voxelSize),
            Math.round(vec.z / this._voxelSize)
        );
    }

    _toModelPosition(vec) {
        return new Vector3(
            vec.x * this._voxelSize,
            vec.y * this._voxelSize,
            vec.z * this._voxelSize
        );
    }

    isVoxelAt(pos) {
        return this.voxelsHash.contains(pos);
    } 

    addVoxel(vec, blockTexcoord) {

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

    // TODO: Fix voxel meshing
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

    splitVoxels() {
        this._voxelSize /= 2;
        this._clearVoxels();
        
        const newTriangleAABBs = [];

        for (const {triangle, AABBs} of this.triangleAABBs) {
            const triangleAABBs = [];
            for (const AABB of AABBs) {
                for (const sub of AABB.subdivide()) {
                    if (triangle.intersectAABB(sub)) {
                        this.addVoxel(sub.centre);
                        triangleAABBs.push(sub);
                    }
                }
            }
            newTriangleAABBs.push({triangle: triangle, AABBs: triangleAABBs});
        }

        this.triangleAABBs = newTriangleAABBs;
    }

    _getVoxelColour(triangle, centre) {
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

        const u = uv1[0] * a1 + uv2[0] * a2 + uv3[0] * a3;
        const v = uv1[1] * a1 + uv2[1] * a2 + uv3[1] * a3;

        //const rgba = triangle.material.texture.getRGBA(u, v);
        if (this._blockMode === "TEXTURE") {
            const rgba = this._currentTexture.getRGBA(u, v);
            return [rgba[0]/255, rgba[1]/255, rgba[2]/255];
        } else {
            return this._currentColour;
        }
    }

    voxeliseTriangle(triangle) {
        const cubeAABB = this._getTriangleCubeAABB(triangle);

        const triangleAABBs = [];

        let queue = [cubeAABB];
        while (queue.length > 0) {
            const aabb = queue.shift();
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
            } else {
                this.failedAABBs.push(aabb);
            }
        }

        this.triangleAABBs.push({triangle: triangle, AABBs: triangleAABBs});
    }

    voxeliseMesh(mesh) {
        for (const material in mesh.materialTriangles) {
            if ("diffuseTexturePath" in mesh._materials[material]) {
                this._currentTexture = new Texture(mesh._materials[material].diffuseTexturePath);
                this._blockMode = "TEXTURE";
            } else {
                this._currentColour = mesh._materials[material].diffuseColour;
                this._blockMode = "FILL";
            }
            for (const triangle of mesh.materialTriangles[material]) {
                this.voxeliseTriangle(triangle);
            }
        }
    }

}

module.exports.VoxelManager = VoxelManager;