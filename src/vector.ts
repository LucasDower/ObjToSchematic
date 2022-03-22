import { Hashable } from './hash_map';
import { ASSERT } from './util';

export class Vector3 extends Hashable {
    public x: number;
    public y: number;
    public z: number;

    constructor(x: number, y: number, z: number) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static fromArray(arr: number[]) {
        ASSERT(arr.length === 3);
        return new Vector3(arr[0], arr[1], arr[2]);
    }

    toArray() {
        return [this.x, this.y, this.z];
    }

    static add(vecA: Vector3, vecB: Vector3) {
        return new Vector3(
            vecA.x + vecB.x,
            vecA.y + vecB.y,
            vecA.z + vecB.z,
        );
    }

    static random() {
        return new Vector3(
            Math.random(),
            Math.random(),
            Math.random(),
        );
    }

    static parse(line: string) {
        const regex = /[+-]?\d+(\.\d+)?/g;
        const floats = line.match(regex)!.map(function(v) {
            return parseFloat(v);
        });

        return new Vector3(
            floats[0], floats[1], floats[2],
        );
    }

    add(vec: Vector3) {
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        return this;
    }

    static addScalar(vec: Vector3, scalar: number) {
        return new Vector3(
            vec.x + scalar,
            vec.y + scalar,
            vec.z + scalar,
        );
    }

    addScalar(scalar: number) {
        this.x += scalar;
        this.y += scalar;
        this.z += scalar;
        return this;
    }

    static sub(vecA: Vector3, vecB: Vector3) {
        return new Vector3(
            vecA.x - vecB.x,
            vecA.y - vecB.y,
            vecA.z - vecB.z,
        );
    }

    sub(vec: Vector3) {
        this.x -= vec.x;
        this.y -= vec.y;
        this.z -= vec.z;
        return this;
    }

    static subScalar(vec: Vector3, scalar: number) {
        return new Vector3(
            vec.x - scalar,
            vec.y - scalar,
            vec.z - scalar,
        );
    }

    static dot(vecA: Vector3, vecB: Vector3) {
        return vecA.x * vecB.x + vecA.y * vecB.y + vecA.z * vecB.z;
    }

    static copy(vec: Vector3) {
        return new Vector3(
            vec.x,
            vec.y,
            vec.z,
        );
    }

    copy() {
        return new Vector3(
            this.x,
            this.y,
            this.z,
        );
    }

    static mulScalar(vec: Vector3, scalar: number) {
        return new Vector3(
            scalar * vec.x,
            scalar * vec.y,
            scalar * vec.z,
        );
    }

    mulScalar(scalar: number) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    static divScalar(vec: Vector3, scalar: number) {
        return new Vector3(
            vec.x / scalar,
            vec.y / scalar,
            vec.z / scalar,
        );
    }

    divScalar(scalar: number) {
        this.x /= scalar;
        this.y /= scalar;
        this.z /= scalar;
        return this;
    }

    static lessThanEqualTo(vecA: Vector3, vecB: Vector3) {
        return vecA.x <= vecB.x && vecA.y <= vecB.y && vecA.z <= vecB.z;
    }

    static round(vec: Vector3) {
        return new Vector3(
            Math.round(vec.x),
            Math.round(vec.y),
            Math.round(vec.z),
        );
    }

    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        this.z = Math.round(this.z);
        return this;
    }

    static abs(vec: Vector3) {
        return new Vector3(
            Math.abs(vec.x),
            Math.abs(vec.y),
            Math.abs(vec.z),
        );
    }

    static cross(vecA: Vector3, vecB: Vector3) {
        return new Vector3(
            vecA.y * vecB.z - vecA.z * vecB.y,
            vecA.z * vecB.x - vecA.x * vecB.z,
            vecA.x * vecB.y - vecA.y * vecB.x,
        );
    }

    static min(vecA: Vector3, vecB: Vector3) {
        return new Vector3(
            Math.min(vecA.x, vecB.x),
            Math.min(vecA.y, vecB.y),
            Math.min(vecA.z, vecB.z),
        );
    }

    static max(vecA: Vector3, vecB: Vector3) {
        return new Vector3(
            Math.max(vecA.x, vecB.x),
            Math.max(vecA.y, vecB.y),
            Math.max(vecA.z, vecB.z),
        );
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

    public static get xAxis() {
        return new Vector3(1.0, 0.0, 0.0);
    }

    public static get yAxis() {
        return new Vector3(0.0, 1.0, 0.0);
    }

    public static get zAxis() {
        return new Vector3(0.0, 0.0, 1.0);
    }

    public isNumber() {
        return !isNaN(this.x) && !isNaN(this.y) && !isNaN(this.z);
    }

    public negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    // Begin IHashable interface
    override hash() {
        const p0 = 73856093;
        const p1 = 19349663;
        const p2 = 83492791;
        return (this.x * p0) ^ (this.y * p1) ^ (this.z * p2);
    }

    override equals(other: Vector3) {
        return this.x == other.x && this.y == other.y && this.z == other.z;
    }
    // End IHashable interface
}
