const twgl = require('twgl.js');

const { Vector3 } = require('./vector.js');
const { ArcballCamera } = require('./camera.js');
const mouseManager = require('./mouse.js');
const shaderManager = require('./shaders.js');

class Renderer {

    constructor(voxelSize) {
        this._gl = document.querySelector("#c").getContext("webgl");

        this._fov = 30;
        this._backgroundColour = new Vector3(0.1, 0.15, 0.2);
        this._strokeColour = new Vector3(1.0, 1.0, 1.0);

        this._camera = new ArcballCamera(this._fov, this._gl.canvas.clientWidth / this._gl.canvas.clientHeight, 0.5, 100.0);

        this._registerEvents();

        this._register = {
            position: {numComponents: 3, data: []},
            indices: {numComponents: 3, data: []},
            colour: {numComponents: 3, data: []}
        };
        this._maxIndex = 0;

        //this._voxelSize = voxelSize;
        this._voxelSizeVector = new Vector3(voxelSize, voxelSize, voxelSize);

        this._registerOpen = true;
    }

    _registerEvents() {
        this._gl.canvas.addEventListener('mousedown', (e) => {
            this._camera.isRotating = true;
        });
    
        this._gl.canvas.addEventListener('mouseup', (e) => {
            this._camera.isRotating = false;
        });
    
        this._gl.canvas.addEventListener('mousemove', (e) => {
            mouseManager.handleInput(e);
            this._camera.updateCamera();
        });
    
        this._gl.canvas.addEventListener('wheel', (e) => {
            this._camera.handleScroll(e);
        });
    }

    begin() {
        twgl.resizeCanvasToDisplaySize(this._gl.canvas);
        this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
        this._camera.aspect = this._gl.canvas.width / this._gl.canvas.height;
        this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA);
        
        this._gl.enable(this._gl.DEPTH_TEST);
        //this._gl.enable(this._gl.CULL_FACE);
        //this._gl.enable(this._gl.BLEND);
        this._gl.clearColor(this._backgroundColour.x, this._backgroundColour.y, this._backgroundColour.z, 1);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

        this._camera.updateCameraPosition();
    }

    compileRegister() {
        console.log(this._register);

        this._registerBuffer = twgl.createBufferInfoFromArrays(this._gl, this._register);
        this._registerOpen = false;
    }

    end() {
        if (this._registerOpen) {
            console.error("Trying to draw register objects before register is closed. Call compileRegister() first.");
            return;
        }

        // Draw objects in register
        const uniforms = {
            u_worldViewProjection: this._camera.getWorldViewProjection()
        };
        
        const shader = shaderManager.unshadedRegisteredProgram;
        this._gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(this._gl, shader, this._registerBuffer);
        twgl.setUniforms(shader, uniforms);
        this._gl.drawElements(this._gl.LINES, this._registerBuffer.numElements, this._gl.UNSIGNED_SHORT, 0);
    }

    setStroke(colour) {
        this._strokeColour = colour;
    }

    _getBoxData(centre, size) {
        const a = Vector3.sub(centre, Vector3.mulScalar(size, 0.5));
        const b = Vector3.add(centre, Vector3.mulScalar(size, 0.5));
        
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
    }

    _getTriangleData(a, b, c) {
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
    }

    /*
    // Use when immediate drawing
    drawBox(centre, size) {
        const data = this._getBoxData(centre, size);
        this._drawData(data);
    }

    // Use when immediate drawing
    drawTriangle(a, b, c) {   
        const data = this._getTriangleData(a, b, c);
        this._drawData(data);
    }
    */

    
    // Use when drawing the same thing each frame
    registerBox(centre, size, debug) {
        if (debug) {
            const data = this._getBoxData(centre, size);
            this._addDataToRegister(data);
        } else {
            // TODO
        }
    }

    // Use when drawing the same triangle each frame
    /*
    registerTriangle(a, b, c) {
        const data = this._getTriangleData(a, b, c);
        this._addDataToRegister(data);
    }*/
    registerTriangle(triangle, debug) {
        if (debug) {
            const data = this._getTriangleData(triangle.v0, triangle.v1, triangle.v2);
            this._addDataToRegister(data);
        } else {
            // TODO
        }
    }

    registerVoxel(centre) {
        const data = this._getBoxData(centre, this._voxelSizeVector);
        this._addDataToRegister(data);
    }

    registerVoxels(voxelCentres) {
        for (const voxelCentre of voxelCentres) {
            this.registerVoxel(voxelCentre);
        }
    }

    _addDataToRegister(data) {
        if (!this._registerOpen) {
            console.error("Trying to register object when register is closed. Register before calling compileRegister()");
            return;
        }

        this._register.position.data.push(...data.position);
        this._register.indices.data.push(...data.indices.map(x => x + this._maxIndex));

        const numVertices = data.position.length / 3;
        const vertexColours = [].concat(...new Array(numVertices).fill(this._strokeColour.toArray()));
        this._register.colour.data.push(...vertexColours);

        this._maxIndex += 1 + Math.max(...data.indices);
    }
    

    _drawData(data) {
        const buffer = twgl.createBufferInfoFromArrays(this._gl, data);

        const uniforms = {
            u_fillColour: this._strokeColour.toArray(),
            u_worldViewProjection: this._camera.getWorldViewProjection()
        };

        const shader = shaderManager.unshadedProgram;
        this._gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(this._gl, shader, buffer);
        twgl.setUniforms(shader, uniforms);
        this._gl.drawElements(this._gl.LINES, buffer.numElements, this._gl.UNSIGNED_SHORT, 0);
    }

}

module.exports.Renderer = Renderer;