const { AABB, CubeAABB } = require("./aabb.js");
const { Vector3 } = require("./vector.js");

class VoxelManager {

    constructor(voxelSize) {
        this._voxelSize = voxelSize;
        this.voxels = [];
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
                    this.voxels.push(aabb.centre);
                }
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