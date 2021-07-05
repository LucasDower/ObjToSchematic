const { AABB, CubeAABB } = require("./aabb.js");
const { Vector3 } = require("./vector.js");
const { HashSet } = require('./hash_map.js');

class VoxelManager {

    constructor(voxelSize) {
        this._voxelSize = voxelSize;
        this.voxels = [];
        this.failedAABBs = [];

        this.minX = Infinity; // JavaScript crack
        this.minY = Infinity;
        this.minZ = Infinity;
        this.maxX = -Infinity;
        this.maxY = -Infinity;
        this.maxZ = -Infinity;
        this.voxelsHash = new HashSet(512);
    }

    setVoxelSize(voxelSize) {
        this._voxelSize = voxelSize;
    }

    clear() {
        this.voxels = [];
        this.failedAABBs = [];
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

        return cubeAABB;
    }

    _voxelCentreToPosition(vec) {
        //Vector3.round(Vector3.subScalar(Vector3.divScalar(vec, this._voxelSize), 0.5));
        return new Vector3(
            Math.round((vec.x / this._voxelSize) - 0.5),
            Math.round((vec.y / this._voxelSize) - 0.5),
            Math.round((vec.z / this._voxelSize) - 0.5)
        );
    }

    addVoxel(vec) {
        this.voxels.push(vec);

        const pos = this._voxelCentreToPosition(vec);
        this.voxelsHash.add(pos, true);

        this.minX = Math.min(this.minX, vec.x);
        this.minY = Math.min(this.minY, vec.y);
        this.minZ = Math.min(this.minZ, vec.z);
        this.maxX = Math.max(this.maxX, vec.x);
        this.maxY = Math.max(this.maxY, vec.y);
        this.maxZ = Math.max(this.maxZ, vec.z);
    }

    buildMesh() {

        let mesh = [];

        //const minPos = this._voxelCentreToPosition(new Vector3(this.minX, this.minY, this.minZ));
        //const maxPos = this._voxelCentreToPosition(new Vector3(this.maxX, this.maxY, this.maxZ));

        for (let y = this.minY; y <= this.maxY; y += this._voxelSize) {
            for (let z = this.minZ; z <= this.maxZ; z += this._voxelSize) {
                let penDown = false;
                let begin = null;

                for (let x = this.minX; x < this.maxX + 2 * this._voxelSize; x += this._voxelSize) {
                    const vec = new Vector3(x, y, z);
                    const pos = this._voxelCentreToPosition(vec);
                    const voxelHere = this.voxelsHash.contains(pos);

                    if (!penDown && voxelHere) {
                        penDown = true;
                        begin = vec;
                    }
                    else if (penDown && !voxelHere) {
                        penDown = false;
                        let end = new Vector3(x - this._voxelSize, y, z);

                        let centre = Vector3.divScalar(Vector3.add(begin, end), 2);
                        let size = new Vector3(end.x - begin.x + this._voxelSize, this._voxelSize, this._voxelSize);

                        mesh.push({centre: centre, size: size});
                    }
                }
            }
        }

        return mesh;
    }

    voxeliseTriangle(triangle) {
        const cubeAABB = this._getTriangleCubeAABB(triangle);

        //renderer.setStroke(new Vector3(1.0, 1.0, 1.0));
        //let voxels = [];

        let queue = [cubeAABB];
        while (queue.length > 0) {
            const aabb = queue.shift();
            if (triangle.intersectAABB(aabb)) {
                if (aabb.width > this._voxelSize) {
                    // Continue to subdivide
                    queue.push(...aabb.subdivide());
                } else {
                    // We've reached the voxel level, stop
                    //renderer.registerBox(aabb.centre, aabb.size);
                    //this.voxels.push(aabb.centre);
                    this.addVoxel(aabb.centre);
                }
            } else {
                this.failedAABBs.push(aabb);
            }
        }

        //return voxels;
    }

    voxeliseMesh(mesh) {
        for (const triangle of mesh.triangles) {
            this.voxeliseTriangle(triangle);
        }
    }

}

module.exports.VoxelManager = VoxelManager;