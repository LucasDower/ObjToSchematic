import * as twgl from 'twgl.js';
import { UVTriangle } from './triangle';
import { Vector3 } from './vector';
import { AttributeData, RenderBuffer } from './buffer';
import { Bounds, RGB } from './util';

export class GeometryTemplates {
    private static readonly _default_cube = twgl.primitives.createCubeVertices(1.0);

    static getTriangleBufferData(triangle: UVTriangle): AttributeData {
        const n = triangle.getNormal();

        return {
            custom: {
                position: [
                    triangle.v0.x, triangle.v0.y, triangle.v0.z,
                    triangle.v1.x, triangle.v1.y, triangle.v1.z,
                    triangle.v2.x, triangle.v2.y, triangle.v2.z,
                ],
                texcoord: [
                    triangle.uv0.u, triangle.uv0.v,
                    triangle.uv1.u, triangle.uv1.v,
                    triangle.uv2.u, triangle.uv2.v,
                ],
                normal: [
                    n.x, n.y, n.z,
                    n.x, n.y, n.z,
                    n.x, n.y, n.z,
                ],
            },
            indices: new Uint32Array([
                0, 1, 2,
            ]),
        };
    }

    static getBoxBufferData(centre: Vector3): AttributeData {
        const cube: AttributeData = {
            custom: {
                position: new Array<number>(72),
                texcoord: new Array<number>(48),
                normal: new Array<number>(72),
            },
            indices: new Uint32Array(72),
        };

        cube.custom.position = Array.from(GeometryTemplates._default_cube.position);
        cube.custom.normal = Array.from(GeometryTemplates._default_cube.normal);
        cube.custom.texcoord = Array.from(GeometryTemplates._default_cube.texcoord);
        cube.indices = Uint32Array.from(GeometryTemplates._default_cube.indices);

        for (let i = 0; i < 72; i += 3) {
            cube.custom.position[i + 0] += centre.x;
            cube.custom.position[i + 1] += centre.y;
            cube.custom.position[i + 2] += centre.z;
        }

        return cube;
    }
}

export class DebugGeometryTemplates {
    public static cross(centre: Vector3, radius: number, colour: RGB): AttributeData {
        return {
            indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
            custom: {
                position: [
                    centre.x + radius, centre.y, centre.z,
                    centre.x - radius, centre.y, centre.z,
                    centre.x, centre.y + radius, centre.z,
                    centre.x, centre.y - radius, centre.z,
                    centre.x, centre.y, centre.z + radius,
                    centre.x, centre.y, centre.z - radius,
                ],
                colour: [
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                ],
            },
        };
    }

    public static line(start: Vector3, end: Vector3, colour: RGB): AttributeData {
        return {
            indices: new Uint32Array([0, 1]),
            custom: {
                position: [
                    start.x, start.y, start.z,
                    end.x, end.y, end.z,
                ],
                colour: [
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                ],
            },
        };
    }

    public static bounds(bounds: Bounds, colour: RGB, translate: Vector3 = new Vector3(0, 0, 0)): AttributeData {
        return {
            indices: new Uint32Array([
                0, 1,
                1, 2,
                2, 3,
                3, 0,
                4, 5,
                5, 6,
                6, 7,
                7, 4,
                0, 4,
                1, 5,
                2, 6,
                3, 7,
            ]),
            custom: {
                position: [
                    bounds.min.x + translate.x, bounds.min.y + translate.y, bounds.min.z + translate.z,
                    bounds.max.x + translate.x, bounds.min.y + translate.y, bounds.min.z + translate.z,
                    bounds.max.x + translate.x, bounds.min.y + translate.y, bounds.max.z + translate.z,
                    bounds.min.x + translate.x, bounds.min.y + translate.y, bounds.max.z + translate.z,
                    bounds.min.x + translate.x, bounds.max.y + translate.y, bounds.min.z + translate.z,
                    bounds.max.x + translate.x, bounds.max.y + translate.y, bounds.min.z + translate.z,
                    bounds.max.x + translate.x, bounds.max.y + translate.y, bounds.max.z + translate.z,
                    bounds.min.x + translate.x, bounds.max.y + translate.y, bounds.max.z + translate.z,
                ],
                colour: [
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                    colour.r, colour.g, colour.b,
                ],
            },
        };
    }

    public static circle(centre: Vector3, normal: Vector3, radius: number, colour: RGB, steps: number = 8): AttributeData {
        const indices = [];
        const positions = [];
        const colours = [];

        const circlePoints = DebugGeometryTemplates._generateCirclePoints(centre, normal, radius, steps);
        for (let i = 0; i < steps; ++i) {
            const point = circlePoints[i];
            positions.push(point.x, point.y, point.z);
            indices.push(i, (i+1) % steps);
            colours.push(colour.r, colour.g, colour.b);
        }

        return {
            indices: new Uint32Array(indices),
            custom: {
                position: positions,
                colour: colours,
            },
        };
    }

    public static cone(tipCentre: Vector3, tipHeight: number, normal: Vector3, radius: number, colour: RGB, quarterSteps: number) {
        const indices = [];
        const positions = [];
        const colours = [];

        const steps = quarterSteps * 4;
        const circleCentre = Vector3.add(tipCentre, Vector3.mulScalar(normal.copy().normalise(), -tipHeight));
        const circlePoints = DebugGeometryTemplates._generateCirclePoints(circleCentre, normal, radius, steps);

        // Add circle data
        for (let i = 0; i < steps; ++i) {
            const point = circlePoints[i];
            positions.push(point.x, point.y, point.z);
            indices.push(i, (i+1) % steps);
            colours.push(colour.r, colour.g, colour.b);
        }
        // Add cone tip
        positions.push(tipCentre.x, tipCentre.y, tipCentre.z);
        colours.push(colour.r, colour.g, colour.b);
        const tipIndex = steps;
        // Add cone lines
        for (let i = 0; i < 4; ++i) {
            const coneIndex = i * quarterSteps;
            indices.push(tipIndex, coneIndex);
        }

        return {
            indices: new Uint32Array(indices),
            custom: {
                position: positions,
                colour: colours,
            },
        };
    }

    static _generateCirclePoints(centre: Vector3, normal: Vector3, radius: number, steps: number): Vector3[] {
        normal = normal.copy().normalise();

        const c = [{ i: 0, v: normal.x }, { i: 1, v: normal.y }, { i: 2, v: normal.z }];
        {
            let comps = c.sort((a, b) => {
                return b.v - a.v;
            }); // largest -> smallest
            comps[2].v = 0;
            const temp = comps[0].v;
            comps[0].v = comps[1].v;
            comps[1].v = temp;
            comps = c.sort((a, b) => {
                return a.i - b.i;
            });
        }
        const aVec = new Vector3(c[0].v, c[1].v, c[2].v);
        const bVec = Vector3.cross(normal, aVec);
        aVec.normalise();
        bVec.normalise();

        const circlePoints: Vector3[] = [];
        for (let i = 0; i < steps; ++i) {
            const t = i / steps * Math.PI * 2;
            const point = centre.copy()
                .add(Vector3.mulScalar(aVec, radius * Math.cos(t)))
                .add(Vector3.mulScalar(bVec, radius * Math.sin(t)));
            circlePoints.push(point);
        }
        return circlePoints;
    }
}
