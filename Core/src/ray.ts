import { OtS_Triangle } from './ots_mesh';
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

export type RayIntersect = (origin: Vector3, v0: Vector3, v1: Vector3, v2: Vector3) => (Vector3 | undefined);

export function rayIntersectTriangleFastX(origin: Vector3, triangle: OtS_Triangle): (Vector3 | undefined) {
    const edge1 = Vector3.sub(triangle.data.v1.position, triangle.data.v0.position);
    const edge2 = Vector3.sub(triangle.data.v2.position, triangle.data.v0.position);

    const h = new Vector3(0, -edge2.z, edge2.y); // Vector3.cross(rayDirection, edge2);
    const a = Vector3.dot(edge1, h);

    if (a > -EPSILON && a < EPSILON) {
        return; // Ray is parallel to triangle
    }

    const f = 1.0 / a;
    const s = Vector3.sub(origin, triangle.data.v0.position);
    const u = f * Vector3.dot(s, h);

    if (u < 0.0 || u > 1.0) {
        return;
    }

    const q = Vector3.cross(s, edge1);
    const v = f * q.x; // f * Vector3.dot(rayDirection, q);

    if (v < 0.0 || u + v > 1.0) {
        return;
    }

    const t = f * Vector3.dot(edge2, q);

    if (t > EPSILON) {
        const result = Vector3.copy(origin);
        result.x += t;
        return result;
        //return Vector3.add(origin,  Vector3.mulScalar(rayDirection, t));
    }
}

export function rayIntersectTriangleFastY(origin: Vector3, triangle: OtS_Triangle): (Vector3 | undefined) {
    const edge1 = Vector3.sub(triangle.data.v1.position, triangle.data.v0.position);
    const edge2 = Vector3.sub(triangle.data.v2.position, triangle.data.v0.position);

    const h = new Vector3(edge2.z, 0, -edge2.x); // Vector3.cross(rayDirection, edge2);
    const a = Vector3.dot(edge1, h);

    if (a > -EPSILON && a < EPSILON) {
        return; // Ray is parallel to triangle
    }

    const f = 1.0 / a;
    const s = Vector3.sub(origin, triangle.data.v0.position);
    const u = f * Vector3.dot(s, h);

    if (u < 0.0 || u > 1.0) {
        return;
    }

    const q = Vector3.cross(s, edge1);
    const v = f * q.y; // f * Vector3.dot(rayDirection, q);

    if (v < 0.0 || u + v > 1.0) {
        return;
    }

    const t = f * Vector3.dot(edge2, q);

    if (t > EPSILON) {
        const result = Vector3.copy(origin);
        result.y += t;
        return result;
        //return Vector3.add(origin,  Vector3.mulScalar(rayDirection, t));
    }
}

export function rayIntersectTriangleFastZ(origin: Vector3, triangle: OtS_Triangle): (Vector3 | undefined) {
    const edge1 = Vector3.sub(triangle.data.v1.position, triangle.data.v0.position);
    const edge2 = Vector3.sub(triangle.data.v2.position, triangle.data.v0.position);

    const h = new Vector3(-edge2.y, edge2.x, 0); // Vector3.cross(rayDirection, edge2);
    const a = Vector3.dot(edge1, h);

    if (a > -EPSILON && a < EPSILON) {
        return; // Ray is parallel to triangle
    }

    const f = 1.0 / a;
    const s = Vector3.sub(origin, triangle.data.v0.position);
    const u = f * Vector3.dot(s, h);

    if (u < 0.0 || u > 1.0) {
        return;
    }

    const q = Vector3.cross(s, edge1);
    const v = f * q.z; // f * Vector3.dot(rayDirection, q);

    if (v < 0.0 || u + v > 1.0) {
        return;
    }

    const t = f * Vector3.dot(edge2, q);

    if (t > EPSILON) {
        const result = Vector3.copy(origin);
        result.z += t;
        return result;
        //return Vector3.add(origin,  Vector3.mulScalar(rayDirection, t));
    }
}