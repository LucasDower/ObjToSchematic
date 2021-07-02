const { v3: Vector3 } = require('twgl.js');
const twgl = require('twgl.js');
const shaderManager = require('./shaders.js');
const { AABB } = require('./aabb.js');
const { xAxis, yAxis, zAxis } = require('./math.js'); 

class Triangle {

    constructor(v0, v1, v2, voxelSize) {
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;

        const u = Vector3.subtract(v1, v0);
        const v = Vector3.subtract(v1, v2);
        this.normal = Vector3.normalize(Vector3.cross(u, v));

        this.voxelSize = voxelSize;

        this._bufferInfoReady = false;
        this._aabb = new AABB(this, voxelSize);
    }

    
    _createBuffer(gl) {
        this._buffer = {
            position: [...this.v0, ...this.v1, ...this.v2],
            normal: [...this.normal, ...this.normal, ...this.normal],
            indices: [1, 0, 2]
        };
        this._bufferInfo = twgl.createBufferInfoFromArrays(gl, this._buffer);

        this._bufferInfoReady = true;
    }
    

    _intersectsAABB(aabb) {
        const v0 = Vector3.subtract(this.v0, aabb.centre);
        const v1 = Vector3.subtract(this.v1, aabb.centre);
        const v2 = Vector3.subtract(this.v2, aabb.centre);

        const f0 = Vector3.subtract(v1, v0);
        const f1 = Vector3.subtract(v2, v1);
        const f2 = Vector3.subtract(v0, v2);

        let axis = [
            Vector3.cross(xAxis, f0),
            Vector3.cross(xAxis, f1),
            Vector3.cross(xAxis, f2),
            Vector3.cross(yAxis, f0),
            Vector3.cross(yAxis, f1),
            Vector3.cross(yAxis, f2),
            Vector3.cross(zAxis, f0),
            Vector3.cross(zAxis, f1),
            Vector3.cross(zAxis, f2),
            xAxis,
            yAxis,
            zAxis,
            Vector3.cross(f0, f2)
        ];

        for (const ax of axis) {
            if (this._testAxis(v0, v1, v2, ax, aabb.size)) {
                return false;
            }
        }

        return true;
    }

    _testAxis(v0, v1, v2, axis, e) {
        const p0 = Vector3.dot(v0, axis);
        const p1 = Vector3.dot(v1, axis);
        const p2 = Vector3.dot(v2, axis);

        const r = e * (Math.abs(Vector3.dot(xAxis, axis)) + 
                       Math.abs(Vector3.dot(yAxis, axis)) + 
                       Math.abs(Vector3.dot(zAxis, axis)));

        return Math.min(p0, p1, 2) > r || Math.max(p0, p1, p2) < -r;
    }

    
    drawTriangle(gl, camera) {
        if (!this._bufferInfoReady) {
            this._createBuffer(gl);
        }

        const uniforms = {
            u_fillColour: Vector3.create(0.0, 1.0, 0.0),
            u_opacity: 1.0,
            u_lightWorldPos: camera.getCameraPosition(0.785398, 0),
            u_worldInverseTranspose: camera.getWorldInverseTranspose(),
            u_worldViewProjection: camera.getWorldViewProjection()
        };

        const shader = shaderManager.unshadedProgram;
        gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(gl, shader, this._bufferInfo);
        twgl.setUniforms(shader, uniforms);
        gl.drawElements(gl.TRIANGLES, this._bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
    }

    drawBounds(gl, camera) {
        this._aabb.drawAABB(gl, camera);
    }

    drawSubdivisions(gl, camera) {
        let queue = [this._aabb];
        while (queue.length > 0) {
            const aabb = queue.shift();
            if (this._intersectsAABB(aabb)) {
                const subdivisions = aabb.subdivide(this.voxelSize);
                if (subdivisions) {
                    queue.push(...subdivisions);
                } else {
                    aabb.drawAABB(gl, camera, Vector3.create(0.0, 1.0, 0.0));
                } 
            } else {
                aabb.drawAABB(gl, camera, Vector3.create(1.0, 0.0, 0.0));
            }
        }
    }
    

    voxelise() {
        let voxels = [];

        let queue = [this._aabb];
        while (queue.length > 0) {
            const aabb = queue.shift();
            if (this._intersectsAABB(aabb)) {
                const subdivisions = aabb.subdivide(this.voxelSize);
                if (subdivisions) {
                    queue.push(...subdivisions);
                } else {
                    voxels.push(aabb.centre);
                } 
            }
        }
        return voxels;
    }

}

module.exports.Triangle = Triangle;