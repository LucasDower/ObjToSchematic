const { AABB } = require("./aabb.js");
const { Vector3 } = require("./vector.js");

class VoxelManager {

    constructor(voxelSize) {
        this._voxelSize = voxelSize;
    }

    cubeifyAABB(aabb, gridSnap) {
        const size = aabb.size;
        const maxDimension = Math.max(size.x, size.y, size.z);
        let newSize = new Vector3(maxDimension, maxDimension, maxDimension);

        if (gridSnap) {
            let newCentre = Vector3.divScalar(aabb.centre, this._voxelSize);
            newCentre = Vector3.round(newCentre);
            newCentre = Vector3.mulScalar(newCentre, this._voxelSize);

            const offset = Vector3.sub(aabb.centre, newCentre);
            console.log(offset);

            //let newSize

            return new AABB(newCentre, newSize);
        }
        return new AABB(aabb.centre, newSize);
    }

    _getTriangleCubeAABB(triangle) {
        let gridSnappedCentre = Vector3.divScalar(triangle.aabb.centre, this._voxelSize);
        gridSnappedCentre = Vector3.round(gridSnappedCentre);
        gridSnappedCentre = Vector3.mulScalar(gridSnappedCentre, this._voxelSize);

        let size = this._voxelSize;
        let cubeAABB = new AABB(gridSnappedCentre, new Vector3(size, size, size));

        while (!triangle.insideAABB(cubeAABB)) {
            cubeAABB = new AABB(cubeAABB.centre, Vector3.mulScalar(cubeAABB.size, 2.0));
        }

        return cubeAABB;
    }

    voxeliseTriangle(triangle, renderer) {
        const cubeAABB = this._getTriangleCubeAABB(triangle);

        renderer.setStroke(new Vector3(1.0, 1.0, 1.0));

        let queue = [cubeAABB];
        while (queue.length > 0) {
            const aabb = queue.shift();
            if (triangle.intersectAABB(aabb)) {
                if (aabb.size.x > this._voxelSize) {
                    // Continue to subdivicde
                    queue.push(...aabb.subdivide());
                } else {
                    // We've reached the voxel level, stop
                    renderer.registerBox(aabb.centre, aabb.size);
                }
            }
        }

        //console.log("Main AABB: ", cubeAABB);

        /*
        const subAABBs = cubeAABB.subdivide();
        renderer.setStroke(new Vector3(1.0, 1.0, 0.0));
        
        for (const subAABB of subAABBs) {
            if (triangle.intersectAABB(subAABB)) {
                renderer.registerBox(subAABB.centre, subAABB.size);
            }
        }
        */
        
        //const subAABB = subAABBs[0];
        //console.log("Sub AABB: ", subAABB);
        //console.log(triangle.intersectAABB(subAABB));
        //renderer.registerBox(subAABB.centre, subAABB.size);
    }

}

module.exports.VoxelManager = VoxelManager;