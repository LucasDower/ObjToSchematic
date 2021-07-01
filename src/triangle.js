const { v3: Vector3 } = require('twgl.js');
const mathUtil = require('./math.js');

class Triangle {

    constructor(v0, v1, v2) {
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;
    }

    getBoundingBox(voxelSize) {
        return { 
            minX: mathUtil.floorTo(Math.min(this.v0[0], this.v1[0], this.v2[0]), voxelSize),
            minY: mathUtil.floorTo(Math.min(this.v0[1], this.v1[1], this.v2[1]), voxelSize),
            minZ: mathUtil.floorTo(Math.min(this.v0[2], this.v1[2], this.v2[2]), voxelSize),

            maxX: mathUtil.ceilTo(Math.max(this.v0[0], this.v1[0], this.v2[0]), voxelSize),
            maxY: mathUtil.ceilTo(Math.max(this.v0[1], this.v1[1], this.v2[1]), voxelSize),
            maxZ: mathUtil.ceilTo(Math.max(this.v0[2], this.v1[2], this.v2[2]), voxelSize),
        };
    }

    voxelise(voxelSize) {
        let voxels = [];

        let bb = this.getBoundingBox(voxelSize);
        for (let x = bb.minX; x < bb.maxX; x += voxelSize) {
            for (let y = bb.minY; y < bb.maxY; y += voxelSize) {
                for (let z = bb.minZ; z < bb.maxZ; z += voxelSize) {
                    if (this.voxelIntersect(x, y, z, voxelSize)) {
                        voxels.push([x, y, z]);
                    }
                }
            }
        }

        return voxels;
    }

    voxelIntersect(x, y, z, voxelSize) {
        let c = Vector3.create(x, y, z);
        let e = Vector3.create(voxelSize/2, voxelSize/2, voxelSize/2);

        let v0_ = Vector3.subtract(this.v0, c);
        let v1_ = Vector3.subtract(this.v1, c);
        let v2_ = Vector3.subtract(this.v2, c);

        let f0 = Vector3.subtract(v1_, v0_);
        let f1 = Vector3.subtract(v2_, v1_);
        let f2 = Vector3.subtract(v0_, v2_);

        let a0 = Vector3.cross(f0, f2);
        if (this.testAxis(v0_, v1_, v2_, a0, e)) {
            return false;
        }

        let a1 = [mathUtil.xAxis, mathUtil.yAxis, mathUtil.zAxis];
        for (let ax of a1) {
            if (this.testAxis(v0_, v1_, v2_, ax, e)) {
                return false;
            }
        }

        let axis = new Array(9);
        axis[0] = Vector3.cross(mathUtil.xAxis, f0);
        axis[1] = Vector3.cross(mathUtil.xAxis, f1);
        axis[2] = Vector3.cross(mathUtil.xAxis, f2);
        axis[3] = Vector3.cross(mathUtil.yAxis, f0);
        axis[4] = Vector3.cross(mathUtil.yAxis, f1);
        axis[5] = Vector3.cross(mathUtil.yAxis, f2);
        axis[6] = Vector3.cross(mathUtil.zAxis, f0);
        axis[7] = Vector3.cross(mathUtil.zAxis, f1);
        axis[8] = Vector3.cross(mathUtil.zAxis, f2);
        for (let ax of axis) {
            if (this.testAxis(v0_, v1_, v2_, ax, e)) {
                return false;
            }
        }
        return true;
    }

    testAxis(v0_, v1_, v2_, axis, e) {
        let p0 = Vector3.dot(v0_, axis);
        let p1 = Vector3.dot(v1_, axis);
        let p2 = Vector3.dot(v2_, axis);

        let r = e[0] * Math.abs(Vector3.dot(mathUtil.xAxis, axis)) +
                e[1] * Math.abs(Vector3.dot(mathUtil.yAxis, axis)) +
                e[2] * Math.abs(Vector3.dot(mathUtil.zAxis, axis));

        return (Math.min(p0, p1, p2) > r || Math.max(p0, p1, p2) < -r);
    }

}

module.exports.Triangle = Triangle;