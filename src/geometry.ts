import * as twgl from 'twgl.js';
import { Triangle } from './triangle';
import { Vector3 } from './vector';
import { VoxelData } from './buffer';


export class GeometryTemplates {
    private static readonly _default_cube = twgl.primitives.createCubeVertices(1.0);

    static getTriangleBufferData(triangle: Triangle, debug: boolean): VoxelData {
        const a = triangle.v0;
        const b = triangle.v1;
        const c = triangle.v2;
        const n = triangle.normal;
        // console.log(triangle);

        if (debug) {
            return {
                position: new Float32Array([
                    a.position.x, a.position.y, a.position.z,
                    b.position.x, b.position.y, b.position.z,
                    c.position.x, c.position.y, c.position.z,
                ]),
                indices: new Uint16Array([
                    0, 1,
                    1, 2,
                    2, 0,
                ]),
            };
        } else {
            return {
                position: new Float32Array([
                    a.position.x, a.position.y, a.position.z,
                    b.position.x, b.position.y, b.position.z,
                    c.position.x, c.position.y, c.position.z,
                ]),
                texcoord: new Float32Array([
                    a.texcoord.u, a.texcoord.v,
                    b.texcoord.u, b.texcoord.v,
                    c.texcoord.u, c.texcoord.v,
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
    }

    static getBoxBufferData(centre: Vector3, debug: boolean): VoxelData {
        const a = Vector3.subScalar(centre, 0.5);
        const b = Vector3.addScalar(centre, 0.5);

        if (debug) {
            return {
                position: new Float32Array([
                    a.x, a.y, a.z,
                    b.x, a.y, a.z,
                    b.x, b.y, a.z,
                    a.x, b.y, a.z,
                    a.x, a.y, b.z,
                    b.x, a.y, b.z,
                    b.x, b.y, b.z,
                    a.x, b.y, b.z,
                ]),
                indices: new Uint16Array([
                    0, 1, 1, 2, 2, 3, 3, 0,
                    4, 5, 5, 6, 6, 7, 7, 4,
                    0, 4, 1, 5, 2, 6, 3, 7,
                ]),
            };
        } else {
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
}
