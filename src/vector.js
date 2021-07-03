const { isVoidExpression, textChangeRangeIsUnchanged } = require("typescript");

class Vector3 {

    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toArray() {
        return [this.x, this.y, this.z];
    }

    static add(vecA, vecB) {
        return new Vector3(
            vecA.x + vecB.x,
            vecA.y + vecB.y,
            vecA.z + vecB.z
        );
    }

    static sub(vecA, vecB) {
        return new Vector3(
            vecA.x - vecB.x,
            vecA.y - vecB.y,
            vecA.z - vecB.z
        );
    }

    static dot(vecA, vecB) {
        return vecA.x * vecB.x + vecA.y * vecB.y + vecA.z * vecB.z;
    }

    static copy(vec) {
        return new Vector3(
            vec.x,
            vec.y,
            vec.z
        );
    }

    static mulScalar(vec, scalar) {
        return new Vector3(
            scalar * vec.x,
            scalar * vec.y,
            scalar * vec.z
        );
    }

    static divScalar(vec, scalar) {
        return new Vector3(
            vec.x / scalar,
            vec.y / scalar,
            vec.z / scalar
        );
    }

    static lessThanEqualTo(vecA, vecB) {
        return vecA.x <= vecB.x && vecA.y <= vecB.y && vecA.z <= vecB.z;
    }

    static round(vec) {
        return new Vector3(
            Math.round(vec.x),
            Math.round(vec.y),
            Math.round(vec.z)
        );
    }

    static abs(vec) {
        return new Vector3(
            Math.abs(vec.x),
            Math.abs(vec.y),
            Math.abs(vec.z)
        );
    }

    static cross(vecA, vecB) {
        return new Vector3(
            vecA.y * vecB.z - vecA.z * vecB.y,
            vecA.z * vecB.x - vecA.x * vecB.z,
            vecA.x * vecB.y - vecA.y * vecB.x
        );
    }

}

module.exports.Vector3 = Vector3;