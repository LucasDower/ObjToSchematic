
const { v3: Vector3 } = require('twgl.js');
const { Triangle } = require('./triangle.js');

const fs = require('fs');
const twgl = require('twgl.js');
const wavefrontObjParser = require('wavefront-obj-parser');
const expandVertexData = require('expand-vertex-data');

const shaderManager = require('./shaders.js');


class Mesh {

    constructor(obj_path, voxelSize, scale) {
        var wavefrontString = fs.readFileSync(obj_path).toString('utf8');
        var parsedJSON = wavefrontObjParser(wavefrontString);
        var expanded = expandVertexData(parsedJSON, {facesToTriangles: true});
    
        this.voxelSize = voxelSize;

        this.model = {
            position: expanded.positions.map(x => x * scale),
            normal: expanded.normals,
            indices: expanded.positionIndices
        };

        this._triangulate();

        this._bufferInfoReady = false;
    }

    _triangulate() {
        this.triangles = [];
        for (let i = 0; i < this.model.indices.length; i += 3) {
            let i0 = this.model.indices[i];
            let i1 = this.model.indices[i + 1];
            let i2 = this.model.indices[i + 2];
            let v0 = this.model.position.slice(3 * i0, 3 * i0 + 3);
            let v1 = this.model.position.slice(3 * i1, 3 * i1 + 3);
            let v2 = this.model.position.slice(3 * i2, 3 * i2 + 3);
            this.triangles.push(new Triangle(v0, v1, v2, this.voxelSize));
        }

        console.log(`Mesh has ${this.triangles.length} triangle(s)`);
    }

    _updateInfoBuffer(gl) {
        this._bufferInfo = twgl.createBufferInfoFromArrays(gl, this.model);
        this._bufferInfoReady = true;
    }

    voxelise() {
        let voxels = [];
        for (const t of this.triangles) {
            voxels.push(...t.voxelise());
        }
        return voxels;
    }

    drawMesh(gl, camera) {
        if (!this._bufferInfoReady) {
            this._updateInfoBuffer(gl);
        }

        const uniforms = {
            u_fillColour: Vector3.create(1.0, 1.0, 1.0),
            u_opacity: 1.0,
            u_lightWorldPos: camera.getCameraPosition(0.785398, 0),
            u_worldInverseTranspose: camera.getWorldInverseTranspose(),
            u_worldViewProjection: camera.getWorldViewProjection()
        };

        const shader = shaderManager.shadedProgram;
        gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(gl, shader, this._bufferInfo);
        twgl.setUniforms(shader, uniforms);
        gl.drawElements(gl.TRIANGLES, this._bufferInfo.numElements, gl.UNSIGNED_SHORT, 0); 
    }

    drawBounds(gl, camera) {
        for (const t of this.triangles) {
            t.drawBounds(gl, camera);
        }
    }

}

module.exports.Mesh = Mesh;