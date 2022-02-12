import * as twgl from 'twgl.js';
import { UVTriangle } from './triangle';
import { Vector3 } from './vector';
import { VoxelData } from './buffer';

export class GeometryTemplates {
    private static readonly _default_cube = twgl.primitives.createCubeVertices(1.0);

    static getTriangleBufferData(triangle: UVTriangle): VoxelData {
        const n = triangle.getNormal();

        const uv0u = triangle.uv0.u;
        if (isNaN(uv0u)) {
            throw Error('oh no');
        }

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

    static getBoxBufferData(centre: Vector3): VoxelData {
        const cube: VoxelData = {
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
