import { Vector3 } from "./vector";
import { AABB } from "./aabb";
import { xAxis, yAxis, zAxis, fastCrossXAxis, fastCrossYAxis, fastCrossZAxis } from "./math";
import { UV } from "./util";


export class Triangle {

    public readonly v0: Vector3;
    public readonly v1: Vector3;
    public readonly v2: Vector3;
    public readonly normal: Vector3;
    
    public readonly uv0: UV;
    public readonly uv1: UV;
    public readonly uv2: UV;

    private readonly aabb!: AABB;

    constructor(v0: Vector3, v1: Vector3, v2: Vector3, uv0: UV, uv1: UV, uv2: UV) {
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;

        this.uv0 = uv0;
        this.uv1 = uv1;
        this.uv2 = uv2;

        const f0 = Vector3.sub(v1, v0);
        const f1 = Vector3.sub(v0, v2);
        this.normal = Vector3.cross(f0, f1).normalise();

        // Calculate bounding box
        {
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
    }

    public getAABB() {
        return this.aabb;
    }

    public insideAABB(aabb: AABB) {
        return Vector3.lessThanEqualTo(aabb.a, this.aabb.a) && Vector3.lessThanEqualTo(this.aabb.b, aabb.b);
    }

    public intersectAABB(aabb: AABB) {
        const extents = Vector3.mulScalar(aabb.size, 0.5);

        const v0 = Vector3.sub(this.v0, aabb.centre);
        const v1 = Vector3.sub(this.v1, aabb.centre);
        const v2 = Vector3.sub(this.v2, aabb.centre);

        const f0 = Vector3.sub(v1, v0);
        const f1 = Vector3.sub(v2, v1);
        const f2 = Vector3.sub(v0, v2);

        const axis = [
            fastCrossXAxis(f0),
            fastCrossXAxis(f1),
            fastCrossXAxis(f2),
            fastCrossYAxis(f0),
            fastCrossYAxis(f1),
            fastCrossYAxis(f2),
            fastCrossZAxis(f0),
            fastCrossZAxis(f1),
            fastCrossZAxis(f2),
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

    private _testAxis(v0: Vector3, v1: Vector3, v2: Vector3, axis: Vector3, extents: Vector3) {
        let p0 = Vector3.dot(v0, axis);
        let p1 = Vector3.dot(v1, axis);
        let p2 = Vector3.dot(v2, axis);

        let r = extents.x * Math.abs(Vector3.dot(xAxis, axis)) +
                extents.y * Math.abs(Vector3.dot(yAxis, axis)) +
                extents.z * Math.abs(Vector3.dot(zAxis, axis));

        return (Math.min(p0, p1, p2) > r || Math.max(p0, p1, p2) < -r);
    }

}