import { Bounds } from './bounds';
import { UV } from './util';
import { Vector3 } from './vector';
export class Triangle {
    public v0: Vector3;
    public v1: Vector3;
    public v2: Vector3;

    constructor(v0: Vector3, v1: Vector3, v2: Vector3) {
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;
    }

    public getCentre(): Vector3 {
        return Vector3.divScalar(Vector3.add(Vector3.add(this.v0, this.v1), this.v2), 3.0);
    }

    public getArea(): number {
        const a = Vector3.sub(this.v0, this.v1).magnitude();
        const b = Vector3.sub(this.v1, this.v2).magnitude();
        const c = Vector3.sub(this.v2, this.v0).magnitude();
        const p = (a + b + c) / 2;
        return Math.sqrt(p * (p - a) * (p - b) * (p - c));
    }

    public getNormal(): Vector3 {
        const u = Vector3.sub(this.v0, this.v1);
        const v = Vector3.sub(this.v0, this.v2);
        return Vector3.cross(u, v).normalise();
    }

    public getBounds(): Bounds {
        return new Bounds(
            new Vector3(
                Math.min(this.v0.x, this.v1.x, this.v2.x),
                Math.min(this.v0.y, this.v1.y, this.v2.y),
                Math.min(this.v0.z, this.v1.z, this.v2.z),
            ),
            new Vector3(
                Math.max(this.v0.x, this.v1.x, this.v2.x),
                Math.max(this.v0.y, this.v1.y, this.v2.y),
                Math.max(this.v0.z, this.v1.z, this.v2.z),
            ),
        );
    }
}

export class UVTriangle extends Triangle {
    public uv0: UV;
    public uv1: UV;
    public uv2: UV;

    public n0: Vector3;
    public n1: Vector3;
    public n2: Vector3;

    constructor(v0: Vector3, v1: Vector3, v2: Vector3, n0: Vector3, n1: Vector3, n2: Vector3, uv0: UV, uv1: UV, uv2: UV) {
        super(v0, v1, v2);

        this.n0 = n0;
        this.n1 = n1;
        this.n2 = n2;

        this.uv0 = uv0;
        this.uv1 = uv1;
        this.uv2 = uv2;
    }
}
