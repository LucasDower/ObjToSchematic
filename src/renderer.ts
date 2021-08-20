import * as twgl from "twgl.js";
import path from "path";

import { Vector3 } from "./vector";
import { ArcballCamera } from "./camera";
import { MouseManager } from "./mouse";
import { ShaderManager } from "./shaders";
import { BottomlessBuffer, SegmentedBuffer, VoxelData } from "./buffer";
import { GeometryTemplates } from "./geometry";
import { RGB, UV, rgbToArray } from "./util";
import { VoxelManager } from "./voxel_manager";
import { Triangle } from "./triangle";
import { Mesh, FillMaterial, TextureMaterial, MaterialType } from "./mesh";


export class Renderer {

    private _backgroundColour: RGB = {r: 0.1, g: 0.1, b: 0.1};
    private _strokeColour: RGB = {r: 1.0, g: 0.0, b: 0.0};
    private _fov: number = 30;
    private _gl: WebGLRenderingContext;
    private _camera: ArcballCamera;
    private _shaderManager: ShaderManager;
    private _atlasTexture: WebGLTexture;
    private _occlusionNeighbours!: Array<Array<Array<Vector3>>>; // Ew
    private _mouseManager: MouseManager

    private _debug: boolean = false;
    private _compiled: boolean = false;

    private _registerDebug!: SegmentedBuffer;
    private _registerVoxels!: SegmentedBuffer;
    private _registerDefault!: SegmentedBuffer;
    private _materialBuffers: Array<{
        buffer: BottomlessBuffer,
        material: (FillMaterial | TextureMaterial)
    }>;

    constructor(gl: WebGLRenderingContext) {
        this._gl = gl;
        this._camera = new ArcballCamera(this._fov, 0.5, 100.0, gl);
        this._mouseManager = new MouseManager(gl);
        this._shaderManager = new ShaderManager(this._gl);

        this._registerEvents();  // Register mouse events for interacting with canvas
        this._getNewBuffers();   // Setup WebGL Buffers
        this._setupOcclusions();

        this._debug = false;
        this._compiled = false;


        

        //this._blockTexture = twgl.createTexture(this._gl, { src: "resources/blocks/stone.png", mag: this._gl.NEAREST });
        this._materialBuffers = [];

        this._atlasTexture = twgl.createTexture(this._gl, {
            src: path.join(__dirname, "../resources/blocks.png"),
            mag: this._gl.NEAREST
        });
         
    }

    


    public set strokeColour(colour: RGB) {
        this._strokeColour = colour;
    }

    public set debug(debug: boolean) {
        this._debug = debug;
    }

    public registerBox(centre: Vector3) { //, size: Vector3) {
        const data = GeometryTemplates.getBoxBufferData(centre, this._debug);
        this._registerData(data);
    }

    private _registerVoxel(centre: Vector3, voxelManager: VoxelManager, blockTexcoord: UV) {   
        let occlusions = new Array<Array<number>>(6);   
        // For each face
        for (let f = 0; f < 6; ++f) {
            // For each vertex
            occlusions[f] = [0, 0, 0, 0];
            
            for (let v = 0; v < 4; ++v) {
                // For each occlusion vertex
                for (let o = 0; o < 3; ++o) {
                    occlusions[f][v] += voxelManager.isVoxelAt(Vector3.add(centre, this._occlusionNeighbours[f][v][o])) ? 1 : 0;
                }
            }

            // Convert from occlusion denoting the occlusion factor to the 
            // attenuation in light value: 0 -> 1.0, 1 -> 0.8, 2 -> 0.6, 3 -> 0.4
            occlusions[f] = occlusions[f].map(x => 1.0 - 0.2 * x);  
        }

        let data: VoxelData = GeometryTemplates.getBoxBufferData(centre, false);

        // Each vertex of a face needs the occlusion data for the other 3 vertices
        // in it's face, not just itself. Also flatten occlusion data.
        data.occlusion = new Array(96);
        data.blockTexcoord = [];
        for (let j = 0; j < 6; ++j) {
            for (let k = 0; k < 16; ++k) {
                data.occlusion[j * 16 + k] = occlusions[j][k % 4];
            }
        }
        const l = data.position.length / 3;
        for (let i = 0; i < l; ++i) {
            data.blockTexcoord.push(blockTexcoord.u, blockTexcoord.v);
        }

        this._registerVoxels.add(data);
    }

    public registerTriangle(triangle: Triangle) {
        const data = GeometryTemplates.getTriangleBufferData(triangle, this._debug);
        this._registerData(data);
    }

    public registerMesh(mesh: Mesh) { 
        for (const material in mesh.materialTriangles) {
            const materialBuffer = new BottomlessBuffer([
                {name: 'position', numComponents: 3},
                {name: 'texcoord', numComponents: 2},
                {name: 'normal', numComponents: 3}
            ]);
            const materialTriangles = mesh.materialTriangles[material];
            console.log(materialTriangles);
            materialTriangles.triangles.forEach(triangle => {
                const data = GeometryTemplates.getTriangleBufferData(triangle, false);
                materialBuffer.add(data);
            });

            this._materialBuffers.push({
                buffer: materialBuffer,
                material: materialTriangles.material
            });
        }

        
        
        console.log("MATERIAL BUFFERS:", this._materialBuffers);
    }

    registerVoxelMesh(voxelManager: VoxelManager) {
        const voxelSize = voxelManager._voxelSize;
        //const sizeVector = new Vector3(voxelSize, voxelSize, voxelSize);
        const sizeVector = new Vector3(1.0, 1.0, 1.0);

        if (this._debug) {
            voxelManager.voxels.forEach((voxel) => {
                this.registerBox(voxel);
            });
        } else {
             // Setup arrays for calculating voxel ambient occlusion
    
            for (let i = 0; i < voxelManager.voxels.length; ++i) {
                const voxel = voxelManager.voxels[i];
                //const colour = voxelManager.voxelColours[i];
                const texcoord = voxelManager.voxelTexcoords[i];
                this._registerVoxel(voxel, voxelManager, texcoord);
            }
            /*
            voxelManager.voxels.forEach((voxel) => {
                this._registerVoxel(voxel, voxelManager);
            });
            */
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
        this._materialBuffers = [];
    }

    compile() {
        this._registerDebug.compile(this._gl);
        this._registerVoxels.compile(this._gl);
        //this._registerDefault.compile(this._gl);

        this._materialBuffers.forEach((materialBuffer) => {
            materialBuffer.buffer.compile(this._gl);
        });


        this._compiled = true;
    }

    draw(voxelSize: number) {
        if (!this._compiled) {
            return;
        }

        this._setupScene();

        // Draw debug register
        this._drawRegister(this._registerDebug, this._gl.LINES, this._shaderManager.debugProgram, {
            u_worldViewProjection: this._camera.getWorldViewProjection(),
        });

        // Draw voxel register
        this._drawRegister(this._registerVoxels, this._gl.TRIANGLES, this._shaderManager.aoProgram, {
            u_worldViewProjection: this._camera.getWorldViewProjection(),
            u_texture: this._atlasTexture,
            u_voxelSize: voxelSize
        });
        
        /*
        // Draw default register
        this._drawRegister(this._registerDefault, this._gl.TRIANGLES, shaderManager.shadedProgram, {
            u_lightWorldPos: this._camera.getCameraPosition(0.0, 0.0),
            u_worldViewProjection: this._camera.getWorldViewProjection(),
            u_worldInverseTranspose: this._camera.getWorldInverseTranspose()
        });
        */

        // Draw material registers
        this._materialBuffers.forEach((materialBuffer) => {
            if (materialBuffer.material.type == MaterialType.Texture) {
                this._drawRegister(materialBuffer.buffer, this._gl.TRIANGLES, this._shaderManager.shadedTextureProgram, {
                    u_lightWorldPos: this._camera.getCameraPosition(0.0, 0.0),
                    u_worldViewProjection: this._camera.getWorldViewProjection(),
                    u_worldInverseTranspose: this._camera.getWorldInverseTranspose(),
                    u_texture: materialBuffer.material.texture
                });
            } else {
                this._drawRegister(materialBuffer.buffer, this._gl.TRIANGLES, this._shaderManager.shadedFillProgram, {
                    u_lightWorldPos: this._camera.getCameraPosition(0.0, 0.0),
                    u_worldViewProjection: this._camera.getWorldViewProjection(),
                    u_worldInverseTranspose: this._camera.getWorldInverseTranspose(),
                    u_fillColour: rgbToArray(materialBuffer.material.diffuseColour)
                });
            }
        });
    }

    _drawRegister(register: (BottomlessBuffer | SegmentedBuffer), drawMode: number, shaderProgram: twgl.ProgramInfo, uniforms: any) {
        for (const buffer of register.WebGLBuffers) {
            this._drawBuffer(drawMode, buffer, shaderProgram, uniforms);
        }
    }

    _setupOcclusions() {
        // TODO: Find some for-loop to clean this up        

        this._occlusionNeighbours = [
            [
                [new Vector3( 1,  1,  0), new Vector3( 1,  1, -1), new Vector3( 1,  0, -1)],
                [new Vector3( 1, -1,  0), new Vector3( 1, -1, -1), new Vector3( 1,  0, -1)],
                [new Vector3( 1,  1,  0), new Vector3( 1,  1,  1), new Vector3( 1,  0,  1)],
                [new Vector3( 1, -1,  0), new Vector3( 1, -1,  1), new Vector3( 1,  0,  1)]
            ],

            [
                [new Vector3(-1,  1,  0), new Vector3(-1,  1,  1), new Vector3(-1,  0,  1)],
                [new Vector3(-1, -1,  0), new Vector3(-1, -1,  1), new Vector3(-1,  0,  1)],
                [new Vector3(-1,  1,  0), new Vector3(-1,  1, -1), new Vector3(-1,  0, -1)],
                [new Vector3(-1, -1,  0), new Vector3(-1, -1, -1), new Vector3(-1,  0, -1)]
            ],

            [
                [new Vector3(-1,  1,  0), new Vector3(-1,  1,  1), new Vector3( 0,  1,  1)],
                [new Vector3(-1,  1,  0), new Vector3(-1,  1, -1), new Vector3( 0,  1, -1)],
                [new Vector3( 1,  1,  0), new Vector3( 1,  1,  1), new Vector3( 0,  1,  1)],
                [new Vector3( 1,  1,  0), new Vector3( 1,  1, -1), new Vector3( 0,  1, -1)]
            ],

            [
                [new Vector3(-1, -1,  0), new Vector3(-1, -1, -1), new Vector3( 0, -1, -1)],
                [new Vector3(-1, -1,  0), new Vector3(-1, -1,  1), new Vector3( 0, -1,  1)],
                [new Vector3( 1, -1,  0), new Vector3( 1, -1, -1), new Vector3( 0, -1, -1)],
                [new Vector3( 1, -1,  0), new Vector3( 1, -1,  1), new Vector3( 0, -1,  1)]
            ],

            [
                [new Vector3( 0,  1,  1), new Vector3( 1,  1,  1), new Vector3( 1,  0,  1)],
                [new Vector3( 0, -1,  1), new Vector3( 1, -1,  1), new Vector3( 1,  0,  1)],
                [new Vector3( 0,  1,  1), new Vector3(-1,  1,  1), new Vector3(-1,  0,  1)],
                [new Vector3( 0, -1,  1), new Vector3(-1, -1,  1), new Vector3(-1,  0,  1)]
            ],

            [
                [new Vector3( 0,  1, -1), new Vector3(-1,  1, -1), new Vector3(-1,  0, -1)],
                [new Vector3( 0, -1, -1), new Vector3(-1, -1, -1), new Vector3(-1,  0, -1)],
                [new Vector3( 0,  1, -1), new Vector3( 1,  1, -1), new Vector3( 1,  0, -1)],
                [new Vector3( 0, -1, -1), new Vector3( 1, -1, -1), new Vector3( 1,  0, -1)]
            ]
        ]
    }

    _registerData(data: VoxelData) {
        if (this._debug) {
            const numVertices = data.position.length / 3;
            data.colour = [].concat(...new Array(numVertices).fill(rgbToArray(this._strokeColour)));
            this._registerDebug.add(data);
        } else {
            this._registerDefault.add(data);
        }       
    }

    _setupScene() {
        twgl.resizeCanvasToDisplaySize(<HTMLCanvasElement>this._gl.canvas);
        this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
        this._camera.aspect = this._gl.canvas.width / this._gl.canvas.height;
        this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA);
        
        this._gl.enable(this._gl.DEPTH_TEST);
        //this._gl.enable(this._gl.CULL_FACE);
        this._gl.enable(this._gl.BLEND);
        this._gl.clearColor(this._backgroundColour.r, this._backgroundColour.g, this._backgroundColour.b, 1.0);
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
            this._mouseManager.handleInput(<MouseEvent>e);
            this._camera.updateCamera(this._mouseManager.getMouseDelta());
        });
    
        this._gl.canvas.addEventListener('wheel', (e) => {
            this._camera.handleScroll(<WheelEvent>e);
        });
    }

    _drawBuffer(drawMode: number, buffer: {numElements: number, buffer: twgl.BufferInfo}, shader: twgl.ProgramInfo, uniforms: any) {
        this._gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(this._gl, shader, buffer.buffer);
        twgl.setUniforms(shader, uniforms);
        this._gl.drawElements(drawMode, buffer.numElements, this._gl.UNSIGNED_SHORT, 0);
    }

    _getNewBuffers() {
        const bufferSize = 16384 * 16;
        this._registerDebug = new SegmentedBuffer(bufferSize, [
            {name: 'position', numComponents: 3, insertIndex: 0},
            {name: 'colour', numComponents: 3, insertIndex: 0}
        ]);
        this._registerVoxels = new SegmentedBuffer(bufferSize, [
            {name: 'position', numComponents: 3, insertIndex: 0},
            {name: 'normal', numComponents: 3, insertIndex: 0},
            {name: 'occlusion', numComponents: 4, insertIndex: 0},
            {name: 'texcoord', numComponents: 2, insertIndex: 0},
            {name: 'blockTexcoord', numComponents: 2, insertIndex: 0},
        ]);
        this._registerDefault = new SegmentedBuffer(bufferSize, [
            {name: 'position', numComponents: 3, insertIndex: 0},
            //{name: 'colour', numComponents: 3},
            {name: 'normal', numComponents: 3, insertIndex: 0}
        ]);
    }

}

module.exports.Renderer = Renderer;