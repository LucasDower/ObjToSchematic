import { Axes, Ray, rayIntersectTriangle } from '../src/ray';
import { Triangle } from '../src/triangle';
import { ASSERT } from '../src/util/error_util';
import { Vector3 } from '../src/vector';

test('rayIntersectTriangle x-axis #1', () => {
    const ray: Ray = {
        origin: new Vector3(-1, 0, 0),
        axis: Axes.x,
    };
    
    const v0 = new Vector3(5, -1, -1);
    const v1 = new Vector3(5, 0, 1);
    const v2 = new Vector3(5, 1, -1);

    const intersects = rayIntersectTriangle(ray, v0, v1, v2);
    expect(intersects).toBeDefined();
    ASSERT(intersects);
    expect(intersects.equals(new Vector3(5, 0, 0))).toEqual(true);
});

test('rayIntersectTriangle x-axis #2', () => {
    const ray: Ray = {
        origin: new Vector3(1, 0, 0),
        axis: Axes.x,
    };
    const tri = new Triangle(
        new Vector3(0, -1, -1),
        new Vector3(0, 0, 1),
        new Vector3(0, 1, -1),
    );
    const intersects = rayIntersectTriangle(ray, tri.v0, tri.v1, tri.v2);
    expect(intersects).toBeUndefined();
});

test('rayIntersectTriangle y-axis #1', () => {
    const ray: Ray = {
        origin: new Vector3(0, -1, 0),
        axis: Axes.y,
    };

    const v0 = new Vector3(-1, 6, -1);
    const v1 = new Vector3(0, 6, 1);
    const v2 = new Vector3(1, 6, -1);

    const intersects = rayIntersectTriangle(ray, v0, v1, v2);
    expect(intersects).toBeDefined();
    ASSERT(intersects);
    expect(intersects.equals(new Vector3(0, 6, 0))).toEqual(true);
});

test('rayIntersectTriangle y-axis #2', () => {
    const ray: Ray = {
        origin: new Vector3(0, 1, 0),
        axis: Axes.y,
    };

    const v0 = new Vector3(-1, 0, -1);
    const v1 = new Vector3(0, 0, 1);
    const v2 = new Vector3(1, 0, -1);

    const intersects = rayIntersectTriangle(ray, v0, v1, v2);
    expect(intersects).toBeUndefined();
});

test('rayIntersectTriangle z-axis #1', () => {
    const ray: Ray = {
        origin: new Vector3(0, 0, -1),
        axis: Axes.z,
    };

    const v0 = new Vector3(-1, -1, 7);
    const v1 = new Vector3(0, 1, 7);
    const v2 = new Vector3(1, -1, 7);

    const intersects = rayIntersectTriangle(ray, v0, v1, v2);
    expect(intersects).toBeDefined();
    ASSERT(intersects);
    expect(intersects.equals(new Vector3(0, 0, 7))).toEqual(true);
});

test('rayIntersectTriangle z-axis #2', () => {
    const ray: Ray = {
        origin: new Vector3(0, 0, 1),
        axis: Axes.z,
    };

    const v0 = new Vector3(-1, -1, 0);
    const v1 = new Vector3(0, 1, 0);
    const v2 = new Vector3(1, -1, 0);

    const intersects = rayIntersectTriangle(ray, v0, v1, v2);
    expect(intersects).toBeUndefined();
});
