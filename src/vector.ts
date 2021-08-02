export class Vector3 {

    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toArray() {
        return [this.x, this.y, this.z];
    }

    static add(vecA: Vector3, vecB: Vector3) {
        return new Vector3(
            vecA.x + vecB.x,
            vecA.y + vecB.y,
            vecA.z + vecB.z
        );
    }

    static addScalar(vec: Vector3, scalar: number) {
        return new Vector3(
            vec.x + scalar,
            vec.y + scalar,
            vec.z + scalar
        );
    }

    static sub(vecA: Vector3, vecB: Vector3) {
        return new Vector3(
            vecA.x - vecB.x,
            vecA.y - vecB.y,
            vecA.z - vecB.z
        );
    }

    static subScalar(vec: Vector3, scalar: number) {
        return new Vector3(
            vec.x - scalar,
            vec.y - scalar,
            vec.z - scalar
        );
    }

    static dot(vecA: Vector3, vecB: Vector3) {
        return vecA.x * vecB.x + vecA.y * vecB.y + vecA.z * vecB.z;
    }

    static copy(vec: Vector3) {
        return new Vector3(
            vec.x,
            vec.y,
            vec.z
        );
    }

    static mulScalar(vec: Vector3, scalar: number) {
        return new Vector3(
            scalar * vec.x,
            scalar * vec.y,
            scalar * vec.z
        );
    }

    static divScalar(vec: Vector3, scalar: number) {
        return new Vector3(
            vec.x / scalar,
            vec.y / scalar,
            vec.z / scalar
        );
    }

    static lessThanEqualTo(vecA: Vector3, vecB: Vector3) {
        return vecA.x <= vecB.x && vecA.y <= vecB.y && vecA.z <= vecB.z;
    }

    static round(vec: Vector3) {
        return new Vector3(
            Math.round(vec.x),
            Math.round(vec.y),
            Math.round(vec.z)
        );
    }

    static abs(vec: Vector3) {
        return new Vector3(
            Math.abs(vec.x),
            Math.abs(vec.y),
            Math.abs(vec.z)
        );
    }

    static cross(vecA: Vector3, vecB: Vector3) {
        return new Vector3(
            vecA.y * vecB.z - vecA.z * vecB.y,
            vecA.z * vecB.x - vecA.x * vecB.z,
            vecA.x * vecB.y - vecA.y * vecB.x
        );
    }

    hash() {
        const p0 = 73856093;
        const p1 = 19349663;
        const p2 = 83492791;
        return (this.x * p0) ^ (this.y * p1) ^ (this.z * p2); 
    }

    equals(vec: Vector3) {
        return this.x == vec.x && this.y == vec.y && this.z == vec.z;
    }

    magnitude() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2));
    }

    normalise() {
        const mag = this.magnitude();
        this.x /= mag;
        this.y /= mag;
        this.z /= mag;

        return this;
    }
    
}