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
            position: new Float32Array([
                triangle.v0.x, triangle.v0.y, triangle.v0.z,
                triangle.v1.x, triangle.v1.y, triangle.v1.z,
                triangle.v2.x, triangle.v2.y, triangle.v2.z,
            ]),
            texcoord: new Float32Array([
                triangle.uv0.u, triangle.uv0.v,
                triangle.uv1.u, triangle.uv1.v,
                triangle.uv2.u, triangle.uv2.v,
            ]),
            normal: new Float32Array([
                n.x, n.y, n.z,
                n.x, n.y, n.z,
                n.x, n.y, n.z,
            ]),
            indices: new Uint16Array([
                0, 1, 2,
            ]),
        };
    }

    static getBoxBufferData(centre: Vector3): VoxelData {
        const cube = {
            position: new Float32Array(72),
            texcoord: new Float32Array(48),
            normal: new Float32Array(72),
            indices: new Uint16Array(72),
        };

        cube.position.set(GeometryTemplates._default_cube.position);
        cube.normal.set(GeometryTemplates._default_cube.normal);
        cube.indices.set(GeometryTemplates._default_cube.indices);
        cube.texcoord.set(GeometryTemplates._default_cube.texcoord);

        for (let i = 0; i < 72; i += 3) {
            cube.position[i + 0] += centre.x;
            cube.position[i + 1] += centre.y;
            cube.position[i + 2] += centre.z;
        }

        return cube;
    }
}
