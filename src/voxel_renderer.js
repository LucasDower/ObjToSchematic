const twgl = require('twgl.js');
const { v3: Vector3 } = require('twgl.js');
const shaderManager = require('./shaders.js');
const primitivesManager = require('./primitives.js');

class VoxelRenderer {

    constructor(gl, voxelSize) {
        this._gl = gl;
        this._voxelSize = voxelSize;
        this._voxels = [];
        this._buffer = {
            position: [],
            normal: [],
            indices: []
        };
        this._bufferInfoReady = false;
    }

    addVoxel(x, y, z) {
        const indexOffset = this._voxels.length * 24;

        /*
        let cube = twgl.primitives.createCubeVertices(this._voxelSize);
        
        // Translate cube to voxel's position
        for (let i = 0; i < 72; i += 3) {
            cube.position[i + 0] += x;
            cube.position[i + 1] += y;
            cube.position[i + 2] += z;
        }
        */

        const centre = Vector3.create(x, y, z);
        const extents = Vector3.create(this._voxelSize, this._voxelSize, this._voxelSize);
        let cube = primitivesManager.getBoxFromCentreExtents(centre, extents);
        
        // Offset indices
        cube.indices = cube.indices.map(x => x + indexOffset);
        
        this._voxels.push([x, y, z]);
        this._buffer.position.push(...cube.position);
        this._buffer.normal.push(...cube.normal);
        this._buffer.indices.push(...cube.indices);

        this._bufferInfoReady = false;
    }

    _updateInfoBuffer() {
        this._bufferInfo = twgl.createBufferInfoFromArrays(this._gl, this._buffer);
        this._bufferInfoReady = true;
    }

    drawVoxels(camera) {
        if (this._voxels.length == 0) {
            return;
        }

        if (!this._bufferInfoReady) {
            this._updateInfoBuffer();
        }

        const uniforms = {
            u_fillColour: Vector3.create(1.0, 1.0, 1.0),
            u_opacity: 0.1,
            u_lightWorldPos: camera.getCameraPosition(0.785398, 0),
            u_worldInverseTranspose: camera.getWorldInverseTranspose(),
            u_worldViewProjection: camera.getWorldViewProjection()
        };

        const shader = shaderManager.shadedProgram;
        this._gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(this._gl, shader, this._bufferInfo);
        twgl.setUniforms(shader, uniforms);
        this._gl.drawElements(this._gl.TRIANGLES, this._bufferInfo.numElements, this._gl.UNSIGNED_SHORT, 0);        
    }

}

module.exports.VoxelRenderer = VoxelRenderer;