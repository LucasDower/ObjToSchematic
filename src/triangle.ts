import { Vector3 } from "./vector";
import { Vertex } from "./mesh";
import { Bounds } from "./util";


export class Triangle {

    public v0: Vertex;
    public v1: Vertex;
    public v2: Vertex;
    public readonly normal: Vector3;

    constructor(v0: Vertex, v1: Vertex, v2: Vertex) {
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;

        const f0 = Vector3.sub(v1.position, v0.position);
        const f1 = Vector3.sub(v0.position, v2.position);
        this.normal = Vector3.cross(f0, f1).normalise();
    }

    public getCentre(): Vector3 {
        return Vector3.divScalar(Vector3.add(Vector3.add(this.v0.position, this.v1.position), this.v2.position), 3.0);
    }

    public getBounds(): Bounds {
        return {
            minX: Math.min(this.v0.position.x, this.v1.position.x, this.v2.position.x),
            minY: Math.min(this.v0.position.y, this.v1.position.y, this.v2.position.y),
            minZ: Math.min(this.v0.position.z, this.v1.position.z, this.v2.position.z),
            maxX: Math.max(this.v0.position.x, this.v1.position.x, this.v2.position.x),
            maxY: Math.max(this.v0.position.y, this.v1.position.y, this.v2.position.y),
            maxZ: Math.max(this.v0.position.z, this.v1.position.z, this.v2.position.z),
        }
    }

}