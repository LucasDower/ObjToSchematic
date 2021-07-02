const { v3: Vector3 } = require('twgl.js');
const twgl = require('twgl.js');
const shaderManager = require('./shaders.js');
const primitivesManager = require('./primitives.js');
const tri = require('./triangle.js');
const mathUtil = require('./math.js');

class AABB {

    constructor(argA, argB) {
        if (argA instanceof tri.Triangle) {
            this._constructFromTriangle(argA, argB);
        } else {
            this._constructFromCentre(argA, argB);
        }

        const halfWidthVector = Vector3.create(this.size, this.size, this.size);
        this.a = Vector3.subtract(this.centre, halfWidthVector);
        this.b = Vector3.add(this.centre, halfWidthVector);

        this._bufferInfoReady = false;
    }

    _constructFromTriangle(tri, voxelSize) {
        const a = Vector3.create(
            Math.min(tri.v0[0], tri.v1[0], tri.v2[0]),
            Math.min(tri.v0[1], tri.v1[1], tri.v2[1]),
            Math.min(tri.v0[2], tri.v1[2], tri.v2[2])
        );

        const b = Vector3.create(
            Math.max(tri.v0[0], tri.v1[0], tri.v2[0]),
            Math.max(tri.v0[1], tri.v1[1], tri.v2[1]),
            Math.max(tri.v0[2], tri.v1[2], tri.v2[2])
        );

        this.centre = Vector3.mulScalar(Vector3.add(a, b), 0.5);
        mathUtil.roundVector3To(this.centre, voxelSize);

        const extents = Vector3.create(
            Math.abs(a[0] - b[0]) / 2,
            Math.abs(a[1] - b[1]) / 2,
            Math.abs(a[2] - b[2]) / 2
        );

        const maxDimension = Math.max(extents[0], extents[1], extents[2]);
        const depth = Math.log2(maxDimension);
        this.size = Math.pow(2, Math.ceil(depth) + 1);
    }

    _constructFromCentre(centre, size) {
        this.centre = centre;
        this.size = size;
    }

    _createBuffer(gl) {
        this._buffer = {
            position: [
                this.a[0], this.a[1], this.a[2],
                this.b[0], this.a[1], this.a[2],
                this.b[0], this.b[1], this.a[2],
                this.a[0], this.b[1], this.a[2],
                this.a[0], this.a[1], this.b[2],
                this.b[0], this.a[1], this.b[2],
                this.b[0], this.b[1], this.b[2],
                this.a[0], this.b[1], this.b[2]
            ],
            indices: [
                0, 1, 1, 2, 2, 3, 3, 0,
                4, 5, 5, 6, 6, 7, 7, 4,
                0, 4, 1, 5, 2, 6, 3, 7
            ]
        };

        this._bufferInfo = twgl.createBufferInfoFromArrays(gl, this._buffer);
        this._bufferInfoReady = true;
    }

    subdivide(voxelSize) {
        if (this.size <= voxelSize) {
            return;
        }

        const subSize = this.size / 2;
        const subCentre = Vector3.add(Vector3.mulScalar(Vector3.subtract(this.b, this.a), 0.25), this.a);
        //const subCentre = Vector3.subtract(this.centre, Vector3.create(subSize, subSize, subSize));

        const result = [
            new AABB(Vector3.add(subCentre, Vector3.create(0,         0,         0        )), subSize),
            new AABB(Vector3.add(subCentre, Vector3.create(this.size, 0,         0        )), subSize),
            new AABB(Vector3.add(subCentre, Vector3.create(0,         this.size, 0        )), subSize),
            new AABB(Vector3.add(subCentre, Vector3.create(this.size, this.size, 0        )), subSize),
            new AABB(Vector3.add(subCentre, Vector3.create(0,         0,         this.size)), subSize),
            new AABB(Vector3.add(subCentre, Vector3.create(this.size, 0,         this.size)), subSize),
            new AABB(Vector3.add(subCentre, Vector3.create(0,         this.size, this.size)), subSize),
            new AABB(Vector3.add(subCentre, Vector3.create(this.size, this.size, this.size)), subSize),
        ];

        return result;
    }

    
    drawAABB(gl, camera, colour) {
        if (!this._bufferInfoReady) {
            this._createBuffer(gl);
        }

        const uniforms = {
            u_fillColour: colour,
            u_worldViewProjection: camera.getWorldViewProjection()
        };

        const shader = shaderManager.unshadedProgram;
        gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(gl, shader, this._bufferInfo);
        twgl.setUniforms(shader, uniforms);
        gl.drawElements(gl.LINES, this._bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
    }
    
}

module.exports.AABB = AABB;