import { Bounds } from './bounds';
import { Vector3 } from './vector';

export class Triangle {
    public static CalcCentre(v0: Vector3, v1: Vector3, v2: Vector3): Vector3 {
        return Vector3.divScalar(Vector3.add(Vector3.add(v0, v1), v2), 3.0);
    }

    public static CalcArea(v0: Vector3, v1: Vector3, v2: Vector3) {
        const a = Vector3.Distance(v0, v1);
        const b = Vector3.Distance(v1, v2);
        const c = Vector3.Distance(v2, v0);
        const p = (a + b + c) / 2;
        return Math.sqrt(p * (p - a) * (p - b) * (p - c));
    }

    public static CalcNormal(v0: Vector3, v1: Vector3, v2: Vector3) {
        const u = Vector3.sub(v0, v1);
        const v = Vector3.sub(v0, v2);
        return Vector3.cross(u, v).normalise();
    }

    public static CalcBounds(v0: Vector3, v1: Vector3, v2: Vector3): Bounds {
        return new Bounds(
            new Vector3(
                Math.min(v0.x, v1.x, v2.x),
                Math.min(v0.y, v1.y, v2.y),
                Math.min(v0.z, v1.z, v2.z),
            ),
            new Vector3(
                Math.max(v0.x, v1.x, v2.x),
                Math.max(v0.y, v1.y, v2.y),
                Math.max(v0.z, v1.z, v2.z),
            ),
        );
    }
}