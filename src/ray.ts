import { Vector3 } from "./vector";
import { Triangle } from "./triangle";
import { floorToNearest, ceilToNearest, xAxis, yAxis, zAxis } from "./math";
import { VoxelManager } from "./voxel_manager";

const EPSILON = 0.0000001;

export enum Axes {
    x, y, z
}

interface Ray {
    origin: Vector3,
    direction: Vector3,
    axis: Axes
}

interface Bounds {
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number,
}

export function generateRays(triangle: Triangle): Array<Ray> {
    const voxelSize = VoxelManager.Get._voxelSize;

    const bounds: Bounds = {
        minX: floorToNearest(Math.min(triangle.v0.position.x, triangle.v1.position.x, triangle.v2.position.x), voxelSize),
        minY: floorToNearest(Math.min(triangle.v0.position.y, triangle.v1.position.y, triangle.v2.position.y), voxelSize),
        minZ: floorToNearest(Math.min(triangle.v0.position.z, triangle.v1.position.z, triangle.v2.position.z), voxelSize),
        maxX: ceilToNearest(Math.max(triangle.v0.position.x, triangle.v1.position.x, triangle.v2.position.x), voxelSize),
        maxY: ceilToNearest(Math.max(triangle.v0.position.y, triangle.v1.position.y, triangle.v2.position.y), voxelSize),
        maxZ: ceilToNearest(Math.max(triangle.v0.position.z, triangle.v1.position.z, triangle.v2.position.z), voxelSize),
    }

    let rayList: Array<Ray> = [];
    if (Math.abs(triangle.normal.x) >= 0.5) {
        traverseX(rayList, bounds, voxelSize);
    }
    if (Math.abs(triangle.normal.y) >= 0.5) {
        traverseY(rayList, bounds, voxelSize);
    }
    if (Math.abs(triangle.normal.z) >= 0.5) {
        traverseZ(rayList, bounds, voxelSize);
    }
    
    return rayList;
}

function traverseX(rayList: Array<Ray>, bounds: Bounds, voxelSize: number) {
    for (let y = bounds.minY; y <= bounds.maxY; y += voxelSize) {
        for (let z = bounds.minZ; z <= bounds.maxZ; z += voxelSize) {
            rayList.push({
                origin: new Vector3(bounds.minX, y, z),
                direction: new Vector3(1, 0, 0),
                axis: Axes.x
            });
        }
    }
}

function traverseY(rayList: Array<Ray>, bounds: Bounds, voxelSize: number) {
    for (let x = bounds.minX; x <= bounds.maxX; x += voxelSize) {
        for (let z = bounds.minZ; z <= bounds.maxZ; z += voxelSize) {
            rayList.push({
                origin: new Vector3(x, bounds.minY, z),
                direction: new Vector3(0, 1, 0),
                axis: Axes.y
            });
        }
    }
}

function traverseZ(rayList: Array<Ray>, bounds: Bounds, voxelSize: number) {
    for (let x = bounds.minX; x <= bounds.maxX; x += voxelSize) {
        for (let y = bounds.minY; y <= bounds.maxY; y += voxelSize) {
            rayList.push({
                origin: new Vector3(x, y, bounds.minZ),
                direction: new Vector3(0, 0, 1),
                axis: Axes.z
            });
        }
    }
}

export function rayIntersectTriangle(ray: Ray, triangle: Triangle): (Vector3 | void) {
    const edge1 = Vector3.sub(triangle.v1.position, triangle.v0.position);
    const edge2 = Vector3.sub(triangle.v2.position, triangle.v0.position);

    const h = Vector3.cross(ray.direction, edge2);
    const a = Vector3.dot(edge1, h);

    if (a > -EPSILON && a < EPSILON) {
        return; // Ray is parallel to triangle
    }

    const f = 1.0 / a;
    const s = Vector3.sub(ray.origin, triangle.v0.position);
    const u = f * Vector3.dot(s, h);

    if (u < 0.0 || u > 1.0) {
        return;
    }

    const q = Vector3.cross(s, edge1);
    const v = f * Vector3.dot(ray.direction, q);

    if (v < 0.0 || u + v > 1.0) {
        return;
    }

    const t = f * Vector3.dot(edge2, q);

    if (t > EPSILON) {
        return Vector3.add(ray.origin, Vector3.mulScalar(ray.direction, t));
    }
}