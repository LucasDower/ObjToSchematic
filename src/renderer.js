const twgl = require('twgl.js');

const { Vector3 } = require('./vector.js');
const { ArcballCamera } = require('./camera.js');
const mouseManager = require('./mouse.js');
const shaderManager = require('./shaders.js');
const { SegmentedBuffer } = require('./buffer.js');
const { GeometryTemplates } = require('./geometry.js');

class Renderer {

    constructor(fov, backgroundColour) {
        this._backgroundColour = backgroundColour;
        this._strokeColour = new Vector3(1.0, 1.0, 1.0);
        
        this._gl = document.querySelector("#c").getContext("webgl");
        this._camera = new ArcballCamera(fov, this._gl.canvas.clientWidth / this._gl.canvas.clientHeight, 0.5, 100.0);

        this._registerEvents();
        this._getNewBuffers();

        this._debug = false;
        this._compiled = false;
    }

    


    setStroke(colour) {
        this._strokeColour = colour;
    }

    setDebug(debug) {
        this._debug = debug;
    }

    registerBox(centre, size) {
        const data = GeometryTemplates.getBoxBufferData(centre, size, this._debug);
        this._registerData(data);
    }

    registerTriangle(triangle) {
        const data = GeometryTemplates.getTriangleBufferData(triangle, this._debug);
        this._registerData(data);
    }

    registerMesh(mesh) {
        for (const triangle of mesh.triangles) {
            this.registerTriangle(triangle);
        }
    }

    registerVoxelMesh(voxelManager) {
        const mesh = voxelManager.buildMesh();
        for (const box of mesh) {
            this.registerBox(box.centre, box.size, false);
        }
    }

    clear() {
        this._getNewBuffers();
    }

    compile() {
        this._registerDebug.compile(this._gl);
        this._register.compile(this._gl);
        this._compiled = true;
    }

    draw() {
        if (!this._compiled) {
            this.compile();
            return;
        }

        this._setupScene();

        this._drawDebugRegisters();
        this._drawRegisters();
    }




    _drawDebugRegisters() {
        const debugUniforms = {
            u_worldViewProjection: this._camera.getWorldViewProjection(),
        };
        
        for (const buffer of this._registerDebug.WebGLBuffers) {
            this._drawBuffer(this._gl.LINES, buffer, shaderManager.debugProgram, debugUniforms);
        }
    }

    _drawRegisters() {
        const uniforms = {
            u_lightWorldPos: this._camera.getCameraPosition(0.0, 0.0),
            u_worldViewProjection: this._camera.getWorldViewProjection(),
            u_worldInverseTranspose: this._camera.getWorldInverseTranspose()
        };

        for (const buffer of this._register.WebGLBuffers) {
            this._drawBuffer(this._gl.TRIANGLES, buffer, shaderManager.shadedProgram, uniforms);
        }
    }

    _registerData(data) {
        if (this._debug) {
            const numVertices = data.position.length / 3;
            data.colour = [].concat(...new Array(numVertices).fill(this._strokeColour.toArray()));
            this._registerDebug.add(data);
        } else {
            this._register.add(data);
        }       
    }

    _setupScene() {
        twgl.resizeCanvasToDisplaySize(this._gl.canvas);
        this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
        this._camera.aspect = this._gl.canvas.width / this._gl.canvas.height;
        //this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA);
        
        this._gl.enable(this._gl.DEPTH_TEST);
        this._gl.enable(this._gl.CULL_FACE);
        //this._gl.enable(this._gl.BLEND);
        this._gl.clearColor(this._backgroundColour.x, this._backgroundColour.y, this._backgroundColour.z, 1);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

        this._camera.updateCameraPosition();  
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

    _drawBuffer(drawMode, buffer, shader, uniforms) {
        this._gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(this._gl, shader, buffer.buffer);
        twgl.setUniforms(shader, uniforms);
        this._gl.drawElements(drawMode, buffer.numElements, this._gl.UNSIGNED_SHORT, 0);
    }

    _getNewBuffers() {
        this._registerDebug = new SegmentedBuffer(16384, [{name: 'position', numComponents: 3}, {name: 'colour', numComponents: 3}]);
        this._register      = new SegmentedBuffer(16384, [{name: 'position', numComponents: 3}, {name: 'normal', numComponents: 3}]);
    }

}

module.exports.Renderer = Renderer;