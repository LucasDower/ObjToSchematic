import * as twgl from 'twgl.js';
import { Triangle, UVTriangle } from './triangle';
import { Vector3 } from './vector';
import { AttributeData, RenderBuffer } from './buffer';
import { Bounds, RGB } from './util';
import { Mesh } from './mesh';

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

    public static cone(tipCentre: Vector3, tipHeight: number, normal: Vector3, radius: number, colour: RGB, quarterSteps: number): AttributeData {
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

    public static grid(axes: boolean, bounds: boolean, gridSize: number): RenderBuffer {
        const buffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 3 },
        ]);
        
        const gridRadius = 9.5;
        const gridColourMinor = new RGB(0.15, 0.15, 0.15);
        const gridColourMajor = new RGB(0.3, 0.3, 0.3);

        if (axes) {
            buffer.add(DebugGeometryTemplates.line(
                new Vector3(-gridRadius, 0, 0),
                new Vector3(gridRadius, 0, 0),
                new RGB(0.44, 0.64, 0.11),
            ));
            buffer.add(DebugGeometryTemplates.cone(
                new Vector3(gridRadius, 0, 0),
                0.5,
                new Vector3(1, 0, 0),
                0.1,
                new RGB(0.44, 0.64, 0.11),
                8,
            ));
            buffer.add(DebugGeometryTemplates.line(
                new Vector3(0, 0, -gridRadius),
                new Vector3(0, 0, gridRadius),
                new RGB(0.96, 0.21, 0.32)),
            );
            buffer.add(DebugGeometryTemplates.cone(
                new Vector3(0, 0, gridRadius),
                0.5,
                new Vector3(0, 0, 1),
                0.1,
                new RGB(0.96, 0.21, 0.32),
                8,
            ));
        }

        if (bounds) {
            buffer.add(DebugGeometryTemplates.line(
                new Vector3(-gridRadius, 0, -gridRadius),
                new Vector3(gridRadius, 0, -gridRadius),
                gridColourMajor,
            ));
            buffer.add(DebugGeometryTemplates.line(
                new Vector3(gridRadius, 0, -gridRadius),
                new Vector3(gridRadius, 0, gridRadius),
                gridColourMajor,
            ));
            buffer.add(DebugGeometryTemplates.line(
                new Vector3(gridRadius, 0, gridRadius),
                new Vector3(-gridRadius, 0, gridRadius),
                gridColourMajor,
            ));
            buffer.add(DebugGeometryTemplates.line(
                new Vector3(-gridRadius, 0, gridRadius),
                new Vector3(-gridRadius, 0, -gridRadius),
                gridColourMajor,
            ));
        }

        let count = 1;
        for (let i = 0; i < gridRadius; i += gridSize) {
            buffer.add(DebugGeometryTemplates.line(
                new Vector3(i, 0, gridRadius),
                new Vector3(i, 0, -gridRadius),
                count % 10 === 0 ? gridColourMajor : gridColourMinor,
            ));
            buffer.add(DebugGeometryTemplates.line(
                new Vector3(gridRadius, 0, i),
                new Vector3(-gridRadius, 0, i),
                count % 10 === 0 ? gridColourMajor : gridColourMinor,
            ));
            ++count;
        }
        count = 1;
        for (let i = 0; i > -gridRadius; i -= gridSize) {
            buffer.add(DebugGeometryTemplates.line(
                new Vector3(i, 0, gridRadius),
                new Vector3(i, 0, -gridRadius),
                count % 10 === 0 ? gridColourMajor : gridColourMinor,
            ));
            buffer.add(DebugGeometryTemplates.line(
                new Vector3(gridRadius, 0, i),
                new Vector3(-gridRadius, 0, i),
                count % 10 === 0 ? gridColourMajor : gridColourMinor,
            ));
            ++count;
        }

        return buffer;
    }

    public static meshWireframe(mesh: Mesh, colour: RGB): RenderBuffer {
        const buffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 3 },
        ]);

        let v0: Vector3 = new Vector3(0, 0, 0);
        let v1: Vector3 = new Vector3(0, 0, 0);
        let v2: Vector3 = new Vector3(0, 0, 0);
        for (let triIndex = 0; triIndex < mesh.getTriangleCount(); ++triIndex) {
            ({ v0, v1, v2 } = mesh.getVertices(triIndex));
            buffer.add(DebugGeometryTemplates.line(
                v0, v1, colour,
            ));
            buffer.add(DebugGeometryTemplates.line(
                v1, v2, colour,
            ));
            buffer.add(DebugGeometryTemplates.line(
                v2, v0, colour,
            ));
        }

        return buffer;
    }

    public static meshNormals(mesh: Mesh, colour: RGB): RenderBuffer {
        const buffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 3 },
        ]);

        for (let triIndex = 0; triIndex < mesh.getTriangleCount(); ++triIndex) {
            const normalLength = 0.1;
            const vertices = mesh.getVertices(triIndex);
            const normals = mesh.getNormals(triIndex);
            const avgNormal = Vector3.add(normals.v0, normals.v1).add(normals.v2).divScalar(3.0);
            const tri = new Triangle(vertices.v0, vertices.v1, vertices.v2);
            const start = tri.getCentre();
            const end = Vector3.add(start, Vector3.mulScalar(avgNormal, normalLength));
            buffer.add(DebugGeometryTemplates.line(
                start,
                end,
                colour,
            ));
        }

        return buffer;
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
