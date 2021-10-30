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
import { FaceInfo } from "./block_atlas";


export class Renderer {

    public _gl: WebGLRenderingContext;

    private _backgroundColour: RGB = {r: 0.1, g: 0.1, b: 0.1};
    private _strokeColour: RGB = {r: 1.0, g: 0.0, b: 0.0};
    private _atlasTexture: WebGLTexture;
    private _occlusionNeighbours!: Array<Array<Array<Vector3>>>; // Ew
    //private _mouseManager: MouseManager

    private _debug: boolean = false;
    private _compiled: boolean = false;

    private _registerDebug!: SegmentedBuffer;
    private _registerVoxels!: SegmentedBuffer;
    private _registerDefault!: SegmentedBuffer;
    private _materialBuffers: Array<{
        buffer: BottomlessBuffer,
        material: (FillMaterial | TextureMaterial)
    }>;
    private _atlasSize?: number;

    private static _instance: Renderer;

    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._gl = (<HTMLCanvasElement>$("#canvas").get(0)).getContext("webgl")!;

        this._getNewBuffers();
        this._setupOcclusions();

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

    private _registerVoxel(centre: Vector3, voxelManager: VoxelManager, blockTexcoord: FaceInfo) {   
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
    
        // Assign the textures to each face
        const faceOrder = ["north", "south", "up", "down", "east", "west"];
        for (const face of faceOrder) {
            for (let i = 0; i < 4; ++i) {
                const texcoord = blockTexcoord[face].texcoord;
                data.blockTexcoord.push(texcoord.u, texcoord.v);
            }
        }

        this._registerVoxels.add(data);
    }

    public registerTriangle(triangle: Triangle) {
        const data = GeometryTemplates.getTriangleBufferData(triangle, this._debug);
        this._registerData(data);
    }

    public registerMesh(mesh: Mesh) {
        //console.log(mesh);

        mesh.materials.forEach(material => {
            const materialBuffer = new BottomlessBuffer([
                { name: 'position', numComponents: 3 },
                { name: 'texcoord', numComponents: 2 },
                { name: 'normal', numComponents: 3 }
            ]);

            material.faces.forEach(face => {
                const data = GeometryTemplates.getTriangleBufferData(face, false);
                //console.log(data);
                materialBuffer.add(data);
            });

            this._materialBuffers.push({
                buffer: materialBuffer,
                material: material.materialData
            });
        });
    }

    registerVoxelMesh() {
        const voxelManager = VoxelManager.Get;
        const voxelSize = voxelManager._voxelSize;
        const sizeVector = new Vector3(1.0, 1.0, 1.0);

        this._atlasSize = voxelManager.blockAtlas._atlasSize;

        if (this._debug) {
            voxelManager.voxels.forEach((voxel) => {
                this.registerBox(voxel.position);
            });
        } else {
            // Setup arrays for calculating voxel ambient occlusion

            for (let i = 0; i < voxelManager.voxels.length; ++i) {
                const voxel = voxelManager.voxels[i];
                //const colour = voxelManager.voxelColours[i];
                const texcoord = voxelManager.voxelTexcoords[i];
                this._registerVoxel(voxel.position, voxelManager, texcoord);
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

    draw() {
        ArcballCamera.Get.updateCamera();

        if (!this._compiled) {
            return;
        }

        this._setupScene();

        // Draw debug register
        this._drawRegister(this._registerDebug, this._gl.LINES, ShaderManager.Get.debugProgram, {
            u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
        });

        // Draw voxel register
        this._drawRegister(this._registerVoxels, this._gl.TRIANGLES, ShaderManager.Get.aoProgram, {
            u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
            u_texture: this._atlasTexture,
            u_voxelSize: VoxelManager.Get._voxelSize,
            u_atlasSize: this._atlasSize
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
        const camera = ArcballCamera.Get;
        this._materialBuffers.forEach((materialBuffer) => {
            if (materialBuffer.material.type == MaterialType.Texture) {
                this._drawRegister(materialBuffer.buffer, this._gl.TRIANGLES, ShaderManager.Get.shadedTextureProgram, {
                    u_lightWorldPos: camera.getCameraPosition(0.0, 0.0),
                    u_worldViewProjection: camera.getWorldViewProjection(),
                    u_worldInverseTranspose: camera.getWorldInverseTranspose(),
                    u_texture: materialBuffer.material.texture
                });
            } else {
                this._drawRegister(materialBuffer.buffer, this._gl.TRIANGLES, ShaderManager.Get.shadedFillProgram, {
                    u_lightWorldPos: camera.getCameraPosition(0.0, 0.0),
                    u_worldViewProjection: camera.getWorldViewProjection(),
                    u_worldInverseTranspose: camera.getWorldInverseTranspose(),
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
                [new Vector3(1, 1, 0), new Vector3(1, 1, -1), new Vector3(1, 0, -1)],
                [new Vector3(1, -1, 0), new Vector3(1, -1, -1), new Vector3(1, 0, -1)],
                [new Vector3(1, 1, 0), new Vector3(1, 1, 1), new Vector3(1, 0, 1)],
                [new Vector3(1, -1, 0), new Vector3(1, -1, 1), new Vector3(1, 0, 1)]
            ],

            [
                [new Vector3(-1, 1, 0), new Vector3(-1, 1, 1), new Vector3(-1, 0, 1)],
                [new Vector3(-1, -1, 0), new Vector3(-1, -1, 1), new Vector3(-1, 0, 1)],
                [new Vector3(-1, 1, 0), new Vector3(-1, 1, -1), new Vector3(-1, 0, -1)],
                [new Vector3(-1, -1, 0), new Vector3(-1, -1, -1), new Vector3(-1, 0, -1)]
            ],

            [
                [new Vector3(-1, 1, 0), new Vector3(-1, 1, 1), new Vector3(0, 1, 1)],
                [new Vector3(-1, 1, 0), new Vector3(-1, 1, -1), new Vector3(0, 1, -1)],
                [new Vector3(1, 1, 0), new Vector3(1, 1, 1), new Vector3(0, 1, 1)],
                [new Vector3(1, 1, 0), new Vector3(1, 1, -1), new Vector3(0, 1, -1)]
            ],

            [
                [new Vector3(-1, -1, 0), new Vector3(-1, -1, -1), new Vector3(0, -1, -1)],
                [new Vector3(-1, -1, 0), new Vector3(-1, -1, 1), new Vector3(0, -1, 1)],
                [new Vector3(1, -1, 0), new Vector3(1, -1, -1), new Vector3(0, -1, -1)],
                [new Vector3(1, -1, 0), new Vector3(1, -1, 1), new Vector3(0, -1, 1)]
            ],

            [
                [new Vector3(0, 1, 1), new Vector3(1, 1, 1), new Vector3(1, 0, 1)],
                [new Vector3(0, -1, 1), new Vector3(1, -1, 1), new Vector3(1, 0, 1)],
                [new Vector3(0, 1, 1), new Vector3(-1, 1, 1), new Vector3(-1, 0, 1)],
                [new Vector3(0, -1, 1), new Vector3(-1, -1, 1), new Vector3(-1, 0, 1)]
            ],

            [
                [new Vector3(0, 1, -1), new Vector3(-1, 1, -1), new Vector3(-1, 0, -1)],
                [new Vector3(0, -1, -1), new Vector3(-1, -1, -1), new Vector3(-1, 0, -1)],
                [new Vector3(0, 1, -1), new Vector3(1, 1, -1), new Vector3(1, 0, -1)],
                [new Vector3(0, -1, -1), new Vector3(1, -1, -1), new Vector3(1, 0, -1)]
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
        ArcballCamera.Get.aspect = this._gl.canvas.width / this._gl.canvas.height;
        this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA);

        this._gl.enable(this._gl.DEPTH_TEST);
        //this._gl.enable(this._gl.CULL_FACE);
        this._gl.enable(this._gl.BLEND);
        this._gl.clearColor(this._backgroundColour.r, this._backgroundColour.g, this._backgroundColour.b, 1.0);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);
    }

    _drawBuffer(drawMode: number, buffer: { numElements: number, buffer: twgl.BufferInfo }, shader: twgl.ProgramInfo, uniforms: any) {
        this._gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(this._gl, shader, buffer.buffer);
        twgl.setUniforms(shader, uniforms);
        this._gl.drawElements(drawMode, buffer.numElements, this._gl.UNSIGNED_SHORT, 0);
    }

    _getNewBuffers() {
        const bufferSize = 16384 * 16;
        this._registerDebug = new SegmentedBuffer(bufferSize, [
            { name: 'position', numComponents: 3, insertIndex: 0 },
            { name: 'colour', numComponents: 3, insertIndex: 0 }
        ]);
        this._registerVoxels = new SegmentedBuffer(bufferSize, [
            { name: 'position', numComponents: 3, insertIndex: 0 },
            { name: 'normal', numComponents: 3, insertIndex: 0 },
            { name: 'occlusion', numComponents: 4, insertIndex: 0 },
            { name: 'texcoord', numComponents: 2, insertIndex: 0 },
            { name: 'blockTexcoord', numComponents: 2, insertIndex: 0 },
        ]);
        this._registerDefault = new SegmentedBuffer(bufferSize, [
            { name: 'position', numComponents: 3, insertIndex: 0 },
            //{name: 'colour', numComponents: 3},
            { name: 'normal', numComponents: 3, insertIndex: 0 }
        ]);
    }

}

module.exports.Renderer = Renderer;