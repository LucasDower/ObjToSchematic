const twgl = require('twgl.js');

const { Vector3 } = require('./vector.js');
const { ArcballCamera } = require('./camera.js');
const mouseManager = require('./mouse.js');
const shaderManager = require('./shaders.js');

class Renderer {

    constructor(voxelSize) {
        this._gl = document.querySelector("#c").getContext("webgl");

        this._fov = 30;
        this._backgroundColour = new Vector3(0.1, 0.1, 0.1);
        this._strokeColour = new Vector3(1.0, 1.0, 1.0);

        this._camera = new ArcballCamera(this._fov, this._gl.canvas.clientWidth / this._gl.canvas.clientHeight, 0.5, 100.0);

        this._registerEvents();

        this._debugRegister = this._getEmptyDebugRegister();
        this._register = this._getEmptyRegister();

        this._filledDebugRegisters = [];
        this._filledRegisters = [];

        this._registerBuffers = [];
        this._debugRegisterBuffers = [];

        this._debugMaxIndex = 0;
        this._maxIndex = 0;

        this._voxelSize = voxelSize;
        this._voxelSizeVector = new Vector3(voxelSize, voxelSize, voxelSize);
        this._cube = twgl.primitives.createCubeVertices(1.0);

        this._registersOpen = true;
    }

    _getEmptyDebugRegister() {
        return {
            position: {numComponents: 3, data: []},
            colour: {numComponents: 3, data: []},
            indices: {numComponents: 3, data: []}
        };
    }

    _getEmptyRegister() {
        return {
            position: {numComponents: 3, data: []},
            normal: {numComponents: 3, data: []},
            indices: {numComponents: 3, data: []},
        };
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
        this._cycleRegister();
        this._cycleDebugRegister();

        //console.log(this._debug);

        for (const register of this._filledRegisters) {
            this._registerBuffers.push(twgl.createBufferInfoFromArrays(this._gl, register));
        }
        for (const debugRegister of this._filledDebugRegisters) {
            this._debugRegisterBuffers.push(twgl.createBufferInfoFromArrays(this._gl, debugRegister));
        }
        //this._debugRegisterBuffer = twgl.createBufferInfoFromArrays(this._gl, this._debugRegister);
        //this._registerBuffer = twgl.createBufferInfoFromArrays(this._gl, this._register);
        this._registersOpen = false;
    }

    setStroke(colour) {
        this._strokeColour = colour;
    }

    end() {
        if (this._registersOpen) {
            //console.error("Trying to draw register objects before register is closed. Call compileRegister() first.");
            return;
        }

        this._drawDebugRegisters();
        this._drawRegisters();
    }

    clear() {
        console.log("clearing");
        
        this._debugRegister = this._getEmptyDebugRegister();
        this._register = this._getEmptyRegister();

        this._filledDebugRegisters = [];
        this._filledRegisters = [];

        this._registerBuffers = [];
        this._debugRegisterBuffers = [];

        this._debugMaxIndex = 0;
        this._maxIndex = 0;

        this._registersOpen = true;
    }

    setVoxelSize(voxelSize) {
        this._voxelSize = voxelSize;
        this._voxelSizeVector = new Vector3(voxelSize, voxelSize, voxelSize);
    }

    _drawDebugRegisters() {
        const uniforms = {
            u_worldViewProjection: this._camera.getWorldViewProjection()
        };
        
        for (const debugBuffer of this._debugRegisterBuffers) {
            this._drawBuffer(this._gl.LINES, debugBuffer, shaderManager.debugProgram, uniforms);
        }
    }

    _drawRegisters() {
        const uniforms = {
            //u_lightWorldPos: this._camera.getCameraPosition(0.5, 0.0),
            u_lightWorldPos: new Vector3(4, 2, 1).normalise().toArray(),
            u_worldViewProjection: this._camera.getWorldViewProjection(),
            u_worldInverseTranspose: this._camera.getWorldInverseTranspose()
        };

        for (const buffer of this._registerBuffers) {
            this._drawBuffer(this._gl.TRIANGLES, buffer, shaderManager.shadedProgram, uniforms);
        }
    }

    _drawBuffer(drawMode, buffer, shader, uniforms) {
        this._gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(this._gl, shader, buffer);
        twgl.setUniforms(shader, uniforms);
        this._gl.drawElements(drawMode, buffer.numElements, this._gl.UNSIGNED_SHORT, 0);
    }

    _getBoxData(centre, size, debug) {
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
            
            cube.position.set(this._cube.position);
            cube.normal.set(this._cube.normal);
            cube.indices.set(this._cube.indices);
            
            for (let i = 0; i < 72; i += 3) {
                cube.position[i + 0] = (cube.position[i + 0] * size.x) + centre.x;
                cube.position[i + 1] = (cube.position[i + 1] * size.y) + centre.y;
                cube.position[i + 2] = (cube.position[i + 2] * size.z) + centre.z;
            }

            return cube;
        }
    }

    _getTriangleData(triangle, debug) {

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
        const data = this._getBoxData(centre, size, debug);
        //console.log(data);
        this._addDataToRegister(data, debug);
    }

    // Use when drawing the same triangle each frame
    /*
    registerTriangle(a, b, c) {
        const data = this._getTriangleData(a, b, c);
        this._addDataToRegister(data);
    }*/

    registerMesh(mesh) {
        for (const triangle of mesh.triangles) {
            this.registerTriangle(triangle, false);
        }
    }

    registerTriangle(triangle, debug) {
        const data = this._getTriangleData(triangle, debug);
        this._addDataToRegister(data, debug);
    }

    registerVoxel(centre, debug) {
        const data = this._getBoxData(centre, this._voxelSizeVector, debug);
        this._addDataToRegister(data, debug);
    }

    registerVoxels(voxelCentres, debug) {
        /*
        for (let i = 0; i < voxelCentres.length; ++i) {
            console.log(i / voxelCentres.length);
            this.registerVoxel(voxelCentres[i], debug);
        }
        */
        for (const voxelCentre of voxelCentres) {
            this.registerVoxel(voxelCentre, debug);
        }
        
    }

    _cycleDebugRegister() {
        this._filledDebugRegisters.push(this._debugRegister);
        this._debugRegister = this._getEmptyDebugRegister();
        //this._debugMaxIndex = 0;
    }
    
    _cycleRegister() {
        this._filledRegisters.push(this._register);
        this._register = this._getEmptyRegister();
        //this._maxIndex = 0;
        //console.log("Cycling Registers");
    }

    _willDataOverflowBuffer(data) {

    }

    _addDataToRegister(data, debug) {
        if (!this._registersOpen) {
            console.error("Trying to register object when register is closed. Register before calling compileRegister()");
            return;
        }

        if (debug) {
            let newMaxIndex = this._debugMaxIndex + 1 + Math.max(...data.indices);
            if (newMaxIndex >= 65535) {
                this._cycleDebugRegister();
                newMaxIndex = 0;
            }

            this._debugRegister.position.data.push(...data.position);
            this._debugRegister.indices.data.push(...data.indices.map(x => x + this._debugMaxIndex));

            const numVertices = data.position.length / 3;
            const vertexColours = [].concat(...new Array(numVertices).fill(this._strokeColour.toArray()));
            this._debugRegister.colour.data.push(...vertexColours);

            this._debugMaxIndex = newMaxIndex;
        } else {
            let newMaxIndex = this._maxIndex + 1 + Math.max(...data.indices);
            if (newMaxIndex >= 65535) {
                this._cycleRegister();
                newMaxIndex = 0;
            }

            this._register.position.data.push(...data.position);
            this._register.normal.data.push(...data.normal);
            this._register.indices.data.push(...data.indices.map(x => x + this._maxIndex));

            this._maxIndex = newMaxIndex;
        }

        
    }
    
    /*
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
    */

}

module.exports.Renderer = Renderer;