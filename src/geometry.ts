import * as twgl from 'twgl.js';
import { Triangle, UVTriangle } from './triangle';
import { Vector3 } from './vector';
import { AttributeData, MergeAttributeData, RenderBuffer } from './buffer';
import { ASSERT, Bounds, RGB, RGBA } from './util';
import { Mesh } from './mesh';
import { VoxelMesh } from './voxel_mesh';

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
    public static cross(centre: Vector3, radius: number, colour: RGBA): AttributeData {
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
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                ],
            },
        };
    }

    public static line(start: Vector3, end: Vector3, colour: RGBA): AttributeData {
        return {
            indices: new Uint32Array([0, 1]),
            custom: {
                position: [
                    start.x, start.y, start.z,
                    end.x, end.y, end.z,
                ],
                colour: [
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                ],
            },
        };
    }

    public static cube(centre: Vector3, size: number, colour: RGBA): AttributeData {
        const min = Vector3.sub(centre, size/2);
        const max = Vector3.add(centre, size/2);
        const bounds = new Bounds(min, max);
        return this.bounds(bounds, colour);
    }

    public static bounds(bounds: Bounds, colour: RGBA): AttributeData {
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
                    bounds.min.x, bounds.min.y, bounds.min.z,
                    bounds.max.x, bounds.min.y, bounds.min.z,
                    bounds.max.x, bounds.min.y, bounds.max.z,
                    bounds.min.x, bounds.min.y, bounds.max.z,
                    bounds.min.x, bounds.max.y, bounds.min.z,
                    bounds.max.x, bounds.max.y, bounds.min.z,
                    bounds.max.x, bounds.max.y, bounds.max.z,
                    bounds.min.x, bounds.max.y, bounds.max.z,
                ],
                colour: [
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                    colour.r, colour.g, colour.b, colour.a,
                ],
            },
        };
    }

    public static circle(centre: Vector3, normal: Vector3, radius: number, colour: RGBA, steps: number = 8): AttributeData {
        const indices = [];
        const positions = [];
        const colours = [];

        const circlePoints = DebugGeometryTemplates._generateCirclePoints(centre, normal, radius, steps);
        for (let i = 0; i < steps; ++i) {
            const point = circlePoints[i];
            positions.push(point.x, point.y, point.z);
            indices.push(i, (i+1) % steps);
            colours.push(colour.r, colour.g, colour.b, colour.a);
        }

        return {
            indices: new Uint32Array(indices),
            custom: {
                position: positions,
                colour: colours,
            },
        };
    }

    public static cone(tipCentre: Vector3, tipHeight: number, normal: Vector3, radius: number, colour: RGBA, quarterSteps: number): AttributeData {
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
            colours.push(colour.r, colour.g, colour.b, colour.a);
        }
        // Add cone tip
        positions.push(tipCentre.x, tipCentre.y, tipCentre.z);
        colours.push(colour.r, colour.g, colour.b, colour.a);
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

    public static arrow(start: Vector3, end: Vector3, colour: RGBA): AttributeData {
        const line = DebugGeometryTemplates.line(start, end, colour);
        const lineLength = Vector3.sub(end, start).magnitude();
        const coneHeight = 0.15 * lineLength;
        const coneRadius = 0.15 * coneHeight;

        const normal = Vector3.sub(end, start).normalise();
        const cone = DebugGeometryTemplates.cone(end, coneHeight, normal, coneRadius, colour, 1);
        
        return MergeAttributeData(line, cone);
    }

    public static grid(dimensions: Vector3, spacing?: number): RenderBuffer {
        const buffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 4 },
        ]);
        const COLOUR_MINOR: RGBA = new RGB(0.5, 0.5, 0.5).toRGBA(0.3);
        const COLOUR_MAJOR: RGBA = RGB.white.toRGBA(0.3);
        
        buffer.add(DebugGeometryTemplates.line(
            new Vector3(-dimensions.x / 2, 0, -dimensions.z / 2),
            new Vector3(-dimensions.x / 2, 0, dimensions.z / 2),
            COLOUR_MAJOR,
        ));

        buffer.add(DebugGeometryTemplates.line(
            new Vector3(dimensions.x / 2, 0, -dimensions.z / 2),
            new Vector3(dimensions.x / 2, 0, dimensions.z / 2),
            COLOUR_MAJOR,
        ));

        buffer.add(DebugGeometryTemplates.line(
            new Vector3(-dimensions.x / 2, 0, -dimensions.z / 2),
            new Vector3(dimensions.x / 2, 0, -dimensions.z / 2),
            COLOUR_MAJOR,
        ));

        buffer.add(DebugGeometryTemplates.line(
            new Vector3(-dimensions.x / 2, 0, dimensions.z / 2),
            new Vector3(dimensions.x / 2, 0, dimensions.z / 2),
            COLOUR_MAJOR,
        ));

        if (spacing) {
            ASSERT(spacing > 0.0);
            for (let x = -dimensions.x / 2; x < dimensions.x / 2; x += spacing) {
                buffer.add(DebugGeometryTemplates.line(
                    new Vector3(x, 0, -dimensions.z / 2),
                    new Vector3(x, 0, dimensions.z / 2),
                    COLOUR_MINOR,
                ));
            }

            for (let z = -dimensions.z / 2; z < dimensions.z / 2; z += spacing) {
                buffer.add(DebugGeometryTemplates.line(
                    new Vector3(-dimensions.x / 2, 0, z),
                    new Vector3(dimensions.x / 2, 0, z),
                    COLOUR_MINOR,
                ));
            }
        }

        return buffer;
    }

    public static meshWireframe(mesh: Mesh, colour: RGBA): RenderBuffer {
        const buffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 4 },
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

    public static voxelMeshWireframe(voxelMesh: VoxelMesh, colour: RGBA, voxelSize: number): RenderBuffer {
        const buffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 4 },
        ]);

        const dimensions = voxelMesh.getBounds().getDimensions();
        const gridOffset = new Vector3(
            dimensions.x % 2 === 0 ? 0 : -0.5,
            dimensions.y % 2 === 0 ? 0 : -0.5,
            dimensions.z % 2 === 0 ? 0 : -0.5,
        );
        for (const voxel of voxelMesh.getVoxels()) {
            buffer.add(DebugGeometryTemplates.cube(
                Vector3.mulScalar(Vector3.add(voxel.position, gridOffset), voxelSize), voxelSize, colour,
            ));
        }

        return buffer;
    }

    public static meshNormals(mesh: Mesh, colour: RGBA): RenderBuffer {
        const buffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 4 },
        ]);

        for (let triIndex = 0; triIndex < mesh.getTriangleCount(); ++triIndex) {
            const normalLength = 0.5;
            const vertices = mesh.getVertices(triIndex);
            const normals = mesh.getNormals(triIndex);
            const avgNormal = Vector3.add(normals.v0, normals.v1).add(normals.v2).divScalar(3.0);
            const tri = new Triangle(vertices.v0, vertices.v1, vertices.v2);
            const start = tri.getCentre();
            const end = Vector3.add(start, Vector3.mulScalar(avgNormal, normalLength));
            buffer.add(DebugGeometryTemplates.arrow(
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
