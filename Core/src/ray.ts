import { ASSERT } from './util/error_util';
import { Vector3 } from './vector';

const EPSILON = 0.0000001;

/* eslint-disable */
export enum Axes {
    x, y, z,
}
/* eslint-enable */

export function axesToDirection(axis: Axes) {
    if (axis === Axes.x) {
        return new Vector3(1, 0, 0);
    }
    if (axis === Axes.y) {
        return new Vector3(0, 1, 0);
    }
    if (axis === Axes.z) {
        return new Vector3(0, 0, 1);
    }
    ASSERT(false);
}

export interface Ray {
    origin: Vector3,
    axis: Axes
}

export function rayIntersectTriangle(ray: Ray, v0: Vector3, v1: Vector3, v2: Vector3): (Vector3 | undefined) {
    const edge1 = Vector3.sub(v1, v0);
    const edge2 = Vector3.sub(v2, v0);

    const rayDirection = axesToDirection(ray.axis);
    const h = Vector3.cross(rayDirection, edge2);
    const a = Vector3.dot(edge1, h);

    if (a > -EPSILON && a < EPSILON) {
        return; // Ray is parallel to triangle
    }

    const f = 1.0 / a;
    const s = Vector3.sub(ray.origin, v0);
    const u = f * Vector3.dot(s, h);

    if (u < 0.0 || u > 1.0) {
        return;
    }

    const q = Vector3.cross(s, edge1);
    const v = f * Vector3.dot(rayDirection, q);

    if (v < 0.0 || u + v > 1.0) {
        return;
    }

    const t = f * Vector3.dot(edge2, q);

    if (t > EPSILON) {
        return Vector3.add(ray.origin, Vector3.mulScalar(rayDirection, t));
    }
}
