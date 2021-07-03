const { Vector3 } = require('./vector.js');
const { AABB } = require('./aabb.js');
const { xAxis, yAxis, zAxis } = require('./math.js');

class Triangle {

    constructor(v0, v1, v2) {
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;

        const f0 = Vector3.sub(v1, v0);
        const f1 = Vector3.sub(v0, v2);
        this.normal = Vector3.cross(f0, f1).normalise();
        //this.normal.normalise();

        this._calculateBoundingBox();
    }

    _calculateBoundingBox() {
        const a = new Vector3(
            Math.min(this.v0.x, this.v1.x, this.v2.x),
            Math.min(this.v0.y, this.v1.y, this.v2.y),
            Math.min(this.v0.z, this.v1.z, this.v2.z)
        );

        const b = new Vector3(
            Math.max(this.v0.x, this.v1.x, this.v2.x),
            Math.max(this.v0.y, this.v1.y, this.v2.y),
            Math.max(this.v0.z, this.v1.z, this.v2.z)
        );

        const centre = Vector3.mulScalar(Vector3.add(a, b), 0.5);
        const size = Vector3.abs(Vector3.sub(a, b));

        this.aabb = new AABB(centre, size);
    }

    insideAABB(aabb) {
        return Vector3.lessThanEqualTo(aabb.a, this.aabb.a) && Vector3.lessThanEqualTo(this.aabb.b, aabb.b);
    }

    intersectAABB(aabb) {
        const extents = Vector3.mulScalar(aabb.size, 0.5);

        const v0 = Vector3.sub(this.v0, aabb.centre);
        const v1 = Vector3.sub(this.v1, aabb.centre);
        const v2 = Vector3.sub(this.v2, aabb.centre);

        const f0 = Vector3.sub(v1, v0);
        const f1 = Vector3.sub(v2, v1);
        const f2 = Vector3.sub(v0, v2);

        const axis = [
            Vector3.cross(xAxis, f0),
            Vector3.cross(xAxis, f1),
            Vector3.cross(xAxis, f2),
            Vector3.cross(yAxis, f0),
            Vector3.cross(yAxis, f1),
            Vector3.cross(yAxis, f2),
            Vector3.cross(zAxis, f0),
            Vector3.cross(zAxis, f1),
            Vector3.cross(zAxis, f2),
            xAxis,
            yAxis,
            zAxis,
            Vector3.cross(f0, f2)
        ];

        for (const ax of axis) {
            if (this._testAxis(v0, v1, v2, ax, extents)) {
                return false;
            }
        }

        return true;
    }

    _testAxis(v0, v1, v2, axis, extents) {
        let p0 = Vector3.dot(v0, axis);
        let p1 = Vector3.dot(v1, axis);
        let p2 = Vector3.dot(v2, axis);

        let r = extents.x * Math.abs(Vector3.dot(xAxis, axis)) +
                extents.y * Math.abs(Vector3.dot(yAxis, axis)) +
                extents.z * Math.abs(Vector3.dot(zAxis, axis));

        return (Math.min(p0, p1, p2) > r || Math.max(p0, p1, p2) < -r);
    }

}

module.exports.Triangle = Triangle;