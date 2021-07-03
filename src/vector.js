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

}

module.exports.Vector3 = Vector3;