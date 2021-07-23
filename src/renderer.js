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

        this._registerEvents();  // Register mouse events for interacting with canvas
        this._getNewBuffers();   // Setup WebGL Buffers

        this._debug = false;
        this._compiled = false;

        this._blockTexture = twgl.createTexture(this._gl, { src: "resources/blocks/stone.png", mag: this._gl.NEAREST });
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

    _registerVoxel(centre, voxelSize, voxelManager) {
        const sizeVector = new Vector3(voxelSize, voxelSize, voxelSize);
        
        let occlusions = new Array(6);   
        // For each face
        for (let f = 0; f < 6; ++f) {
            // For each vertex
            occlusions[f] = [0, 0, 0, 0];
            for (let v = 0; v < 4; ++v) {
                // For each occlusion vertex
                for (let o = 0; o < 3; ++o) {
                    occlusions[f][v] += voxelManager.isVoxelAt(Vector3.add(centre, this.occlusions[f][v][o]));
                }
            }
        }
        
        // Each vertex of a face needs the occlusion data for the other 3 vertices
        // in it's face, not just itself, pack this into a vec4.
        for (let i = 0; i < 6; ++i) {
            occlusions[i] = [].concat(...new Array(4).fill(occlusions[i]));
        }    
        
        let data = GeometryTemplates.getBoxBufferData(centre, sizeVector, false);
        data.occlusion = [].concat(...occlusions);

        // Convert from occlusion denoting the occlusion factor to the 
        // attenuation in light value: 0 -> 1.0, 1 -> 0.8, 2 -> 0.6, 3 -> 0.4
        data.occlusion = data.occlusion.map(x => 1.0 - 0.2 * x);        

        //this._registerData(data);
        this._registerVoxels.add(data);
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
        const voxelSize = voxelManager._voxelSize;
        const sizeVector = new Vector3(voxelSize, voxelSize, voxelSize);
        if (this._debug) {
            voxelManager.voxels.forEach((voxel) => {
                this.registerBox(voxel, sizeVector);
            });
        } else {
            this._setupOcclusions(voxelSize); // Setup arrays for calculating voxel ambient occlusion
    
            voxelManager.voxels.forEach((voxel) => {
                this._registerVoxel(voxel, voxelSize, voxelManager);
            });
        }
        
        /*
        const mesh = voxelManager.buildMesh();
        for (const box of mesh) {
            this.registerBox(box.centre, box.size, false);
        }
        */
    }

    clear() {
        this._getNewBuffers();
    }

    compile() {
        this._registerDebug.compile(this._gl);
        this._registerVoxels.compile(this._gl);
        this._registerDefault.compile(this._gl);
        this._compiled = true;
    }

    draw() {
        if (!this._compiled) {
            this.compile();
            return;
        }

        this._setupScene();

        // Draw debug register
        this._drawRegister(this._registerDebug, this._gl.LINES, shaderManager.debugProgram, {
            u_worldViewProjection: this._camera.getWorldViewProjection(),
        });

        // Draw voxel register
        this._drawRegister(this._registerVoxels, this._gl.TRIANGLES, shaderManager.aoProgram, {
            u_worldViewProjection: this._camera.getWorldViewProjection(),
            u_texture: this._blockTexture
        });
        
        // Draw default register
        this._drawRegister(this._registerDefault, this._gl.TRIANGLES, shaderManager.shadedProgram, {
            u_lightWorldPos: this._camera.getCameraPosition(0.0, 0.0),
            u_worldViewProjection: this._camera.getWorldViewProjection(),
            u_worldInverseTranspose: this._camera.getWorldInverseTranspose()
        });
    }

    _drawRegister(register, drawMode, shaderProgram, uniforms) {
        for (const buffer of register.WebGLBuffers) {
            this._drawBuffer(drawMode, buffer, shaderProgram, uniforms);
        }
    }

    _setupOcclusions(voxelSize) {
        this.occlusions = new Array(6).fill(null).map(function() { return new Array(4).fill(0); });

        this.occlusions[0][0] = [new Vector3( 1,  1,  0), new Vector3( 1,  1, -1), new Vector3( 1,  0, -1)];
        this.occlusions[0][1] = [new Vector3( 1, -1,  0), new Vector3( 1, -1, -1), new Vector3( 1,  0, -1)];
        this.occlusions[0][2] = [new Vector3( 1,  1,  0), new Vector3( 1,  1,  1), new Vector3( 1,  0,  1)];
        this.occlusions[0][3] = [new Vector3( 1, -1,  0), new Vector3( 1, -1,  1), new Vector3( 1,  0,  1)];

        this.occlusions[1][0] = [new Vector3(-1,  1,  0), new Vector3(-1,  1,  1), new Vector3(-1,  0,  1)];
        this.occlusions[1][1] = [new Vector3(-1, -1,  0), new Vector3(-1, -1,  1), new Vector3(-1,  0,  1)];
        this.occlusions[1][2] = [new Vector3(-1,  1,  0), new Vector3(-1,  1, -1), new Vector3(-1,  0, -1)];
        this.occlusions[1][3] = [new Vector3(-1, -1,  0), new Vector3(-1, -1, -1), new Vector3(-1,  0, -1)];

        this.occlusions[2][0] = [new Vector3(-1,  1,  0), new Vector3(-1,  1,  1), new Vector3( 0,  1,  1)];
        this.occlusions[2][1] = [new Vector3(-1,  1,  0), new Vector3(-1,  1, -1), new Vector3( 0,  1, -1)];
        this.occlusions[2][2] = [new Vector3( 1,  1,  0), new Vector3( 1,  1,  1), new Vector3( 0,  1,  1)];
        this.occlusions[2][3] = [new Vector3( 1,  1,  0), new Vector3( 1,  1, -1), new Vector3( 0,  1, -1)];

        this.occlusions[3][0] = [new Vector3(-1, -1,  0), new Vector3(-1, -1, -1), new Vector3( 0, -1, -1)];
        this.occlusions[3][1] = [new Vector3(-1, -1,  0), new Vector3(-1, -1,  1), new Vector3( 0, -1,  1)];
        this.occlusions[3][2] = [new Vector3( 1, -1,  0), new Vector3( 1, -1, -1), new Vector3( 0, -1, -1)];
        this.occlusions[3][3] = [new Vector3( 1, -1,  0), new Vector3( 1, -1,  1), new Vector3( 0, -1,  1)];

        this.occlusions[4][0] = [new Vector3( 0,  1,  1), new Vector3( 1,  1,  1), new Vector3( 1,  0,  1)];
        this.occlusions[4][1] = [new Vector3( 0, -1,  1), new Vector3( 1, -1,  1), new Vector3( 1,  0,  1)];
        this.occlusions[4][2] = [new Vector3( 0,  1,  1), new Vector3(-1,  1,  1), new Vector3(-1,  0,  1)];
        this.occlusions[4][3] = [new Vector3( 0, -1,  1), new Vector3(-1, -1,  1), new Vector3(-1,  0,  1)];

        this.occlusions[5][0] = [new Vector3( 0,  1, -1), new Vector3(-1,  1, -1), new Vector3(-1,  0, -1)];
        this.occlusions[5][1] = [new Vector3( 0, -1, -1), new Vector3(-1, -1, -1), new Vector3(-1,  0, -1)];
        this.occlusions[5][2] = [new Vector3( 0,  1, -1), new Vector3( 1,  1, -1), new Vector3( 1,  0, -1)];
        this.occlusions[5][3] = [new Vector3( 0, -1, -1), new Vector3( 1, -1, -1), new Vector3( 1,  0, -1)];

        // Scale each Vector3 by voxelSize
        for (let i = 0; i < 6; ++i) {
            for (let j = 0; j < 4; ++j) {
                for (let k = 0; k < 3; ++k) {
                    this.occlusions[i][j][k] = Vector3.mulScalar(this.occlusions[i][j][k], voxelSize);
                }
            }
        }
    }

    _registerData(data) {
        if (this._debug) {
            const numVertices = data.position.length / 3;
            data.colour = [].concat(...new Array(numVertices).fill(this._strokeColour.toArray()));
            this._registerDebug.add(data);
        } else {
            this._registerDefault.add(data);
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
        //console.log(shader);
        this._gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(this._gl, shader, buffer.buffer);
        twgl.setUniforms(shader, uniforms);
        this._gl.drawElements(drawMode, buffer.numElements, this._gl.UNSIGNED_SHORT, 0);
    }

    _getNewBuffers() {
        this._registerDebug = new SegmentedBuffer(16384, [
            {name: 'position', numComponents: 3},
            {name: 'colour', numComponents: 3}
        ]);
        this._registerVoxels = new SegmentedBuffer(16384, [
            {name: 'position', numComponents: 3},
            {name: 'normal', numComponents: 3},
            {name: 'occlusion', numComponents: 4},
            {name: 'texcoord', numComponents: 2}
        ]);
        this._registerDefault = new SegmentedBuffer(16384, [
            {name: 'position', numComponents: 3},
            {name: 'normal', numComponents: 3}
        ]);
    }

}

module.exports.Renderer = Renderer;