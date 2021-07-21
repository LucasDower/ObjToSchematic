const twgl = require('twgl.js');
const { Vector3 } = require('./vector.js');

const default_cube = twgl.primitives.createCubeVertices(1.0);

class GeometryTemplates {

    static getTriangleBufferData(triangle, debug) {
        const a = triangle.v0;
        const b = triangle.v1;
        const c = triangle.v2;
        const n = triangle.normal;

        if (debug) {
            return {
                position: [
                    a.x, a.y, a.z,
                    b.x, b.y, b.z,
                    c.x, c.y, c.z,
                ],
                indices: [
                    0, 1,
                    1, 2,
                    2, 0
                ]
            };
        } else {
            return {
                position: [
                    a.x, a.y, a.z,
                    b.x, b.y, b.z,
                    c.x, c.y, c.z,
                ],
                normal: [
                    n.x, n.y, n.z,
                    n.x, n.y, n.z,
                    n.x, n.y, n.z
                ],
                indices: [
                    0, 1, 2
                ]
            };
        }
    }

    static getBoxBufferData(centre, size, debug) {
        const a = Vector3.sub(centre, Vector3.mulScalar(size, 0.5));
        const b = Vector3.add(centre, Vector3.mulScalar(size, 0.5));
        
        if (debug) {
            return {
                position: [
                    a.x, a.y, a.z,
                    b.x, a.y, a.z,
                    b.x, b.y, a.z,
                    a.x, b.y, a.z,
                    a.x, a.y, b.z,
                    b.x, a.y, b.z,
                    b.x, b.y, b.z,
                    a.x, b.y, b.z
                ],
                indices: [
                    0, 1, 1, 2, 2, 3, 3, 0,
                    4, 5, 5, 6, 6, 7, 7, 4,
                    0, 4, 1, 5, 2, 6, 3, 7
                ]
            };
        } else {
            
            let cube = {
                position: new Float32Array(72),
                normal: new Float32Array(72),
                indices: new Float32Array(72)
            };
            
            cube.position.set(default_cube.position);
            cube.normal.set(default_cube.normal);
            cube.indices.set(default_cube.indices);
            
            for (let i = 0; i < 72; i += 3) {
                cube.position[i + 0] = (cube.position[i + 0] * size.x) + centre.x;
                cube.position[i + 1] = (cube.position[i + 1] * size.y) + centre.y;
                cube.position[i + 2] = (cube.position[i + 2] * size.z) + centre.z;
            }

            return cube;
        }
    }

}

module.exports.GeometryTemplates = GeometryTemplates;