import * as twgl from 'twgl.js';
import path from 'path';

import { Vector3 } from './vector';
import { ArcballCamera } from './camera';
import { ShaderManager } from './shaders';
import { BottomlessBuffer, SegmentedBuffer, VoxelData } from './buffer';
import { GeometryTemplates } from './geometry';
import { RGB, rgbToArray } from './util';
import { VoxelManager } from './voxel_manager';
import { Triangle } from './triangle';
import { Mesh, FillMaterial, TextureMaterial, MaterialType } from './mesh';
import { FaceInfo, BlockAtlas } from './block_atlas';
import { AppConfig } from './config';
import { AppContext } from './app_context';

export class Renderer {
    public _gl: WebGLRenderingContext;

    private _backgroundColour: RGB = {r: 0.1, g: 0.1, b: 0.1};
    private _strokeColour: RGB = {r: 1.0, g: 0.0, b: 0.0};
    private _atlasTexture: WebGLTexture;
    private _occlusionNeighboursIndices!: Array<Array<Array<number>>>; // Ew

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
        this._gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl')!;

        this._getNewBuffers();
        this._setupOcclusions();

        this._materialBuffers = [];

        this._atlasTexture = twgl.createTexture(this._gl, {
            src: path.join(__dirname, '../resources/blocks.png'),
            mag: this._gl.NEAREST,
        });
    }

    public set strokeColour(colour: RGB) {
        this._strokeColour = colour;
    }

    public set debug(debug: boolean) {
        this._debug = debug;
    }

    public registerBox(centre: Vector3) { // , size: Vector3) {
        const data = GeometryTemplates.getBoxBufferData(centre, this._debug);
        this._registerData(data);
    }

    private static _getNeighbourIndex(neighbour: Vector3) {
        return 9*(neighbour.x+1) + 3*(neighbour.y+1) + (neighbour.z+1);
    }

    private static _faceNormal = [
        new Vector3(1, 0, 0), new Vector3(-1, 0, 0),
        new Vector3(0, 1, 0), new Vector3(0, -1, 0),
        new Vector3(0, 0, 1), new Vector3(0, 0, -1),
    ];

    private _calculateOcclusions(centre: Vector3) {
        const voxelManager = VoxelManager.Get;

        // Cache local neighbours
        const localNeighbourhoodCache = Array<number>(27);
        for (let i = -1; i <= 1; ++i) {
            for (let j = -1; j <= 1; ++j) {
                for (let k = -1; k <= 1; ++k) {
                    const neighbour = new Vector3(i, j, k);
                    const neighbourIndex = Renderer._getNeighbourIndex(neighbour);
                    localNeighbourhoodCache[neighbourIndex] = voxelManager.isVoxelAt(Vector3.add(centre, neighbour)) ? 1 : 0;
                }
            }
        }

        const occlusions = new Array<Array<number>>(6);
        // For each face
        for (let f = 0; f < 6; ++f) {
            occlusions[f] = [1, 1, 1, 1];

            // Only compute ambient occlusion if this face is visible
            const faceNormal = Renderer._faceNormal[f];
            const faceNeighbourIndex = Renderer._getNeighbourIndex(faceNormal);
            const faceVisible = localNeighbourhoodCache[faceNeighbourIndex] === 0;

            if (faceVisible) {
                for (let v = 0; v < 4; ++v) {
                    let numNeighbours = 0;
                    for (let i = 0; i < 2; ++i) {
                        const neighbourIndex = this._occlusionNeighboursIndices[f][v][i];
                        numNeighbours += localNeighbourhoodCache[neighbourIndex];
                    }
                    // If both edge blocks along this vertex exist,
                    // assume corner exists (even if it doesnt)
                    // (This is a stylistic choice)
                    if (numNeighbours == 2 && AppConfig.AMBIENT_OCCLUSION_OVERRIDE_CORNER) {
                        ++numNeighbours;
                    } else {
                        const neighbourIndex = this._occlusionNeighboursIndices[f][v][2];
                        numNeighbours += localNeighbourhoodCache[neighbourIndex];
                    }

                    // Convert from occlusion denoting the occlusion factor to the
                    // attenuation in light value: 0 -> 1.0, 1 -> 0.8, 2 -> 0.6, 3 -> 0.4
                    occlusions[f][v] = 1.0 - 0.2 * numNeighbours;
                }
            }
        }

        return occlusions;
    }

    private static _getBlankOcclusions() {
        const blankOcclusions = new Array<Array<number>>(6);
        for (let f = 0; f < 6; ++f) {
            blankOcclusions[f] = [1, 1, 1, 1];
        }
        return blankOcclusions;
    }

    private static readonly _faceNormals  = [
        new Vector3(1,  0,  0),
        new Vector3(-1, 0,  0),
        new Vector3(0,  1,  0),
        new Vector3(0, -1,  0),
        new Vector3(0,  0,  1),
        new Vector3(0,  0, -1),
    ];

    private _registerVoxel(centre: Vector3, blockTexcoord: FaceInfo) {
        let occlusions: number[][];
        if (AppContext.Get.ambientOcclusion) {
            occlusions = this._calculateOcclusions(centre);
        } else {
            occlusions = Renderer._getBlankOcclusions();
        }

        const data: VoxelData = GeometryTemplates.getBoxBufferData(centre, false);

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
        const faceOrder = ['north', 'south', 'up', 'down', 'east', 'west'];
        for (const face of faceOrder) {
            for (let i = 0; i < 4; ++i) {
                const texcoord = blockTexcoord[face].texcoord;
                data.blockTexcoord.push(texcoord.u, texcoord.v);
            }
        }

        this._registerVoxels.add(data);
        /*
        for (let i = 0; i < 6; ++i) {
            if (!VoxelManager.Get.isVoxelAt(Vector3.add(centre, Renderer._faceNormals[i]))) {
                this._registerVoxels.add({
                    position: data.position.slice(i * 12, (i+1) * 12),
                    occlusion: data.occlusion.slice(i * 16, (i+1) * 16),
                    normal: data.normal.slice(i * 12, (i+1) * 12),
                    indices: data.indices.slice(0, 6),
                    texcoord: data.texcoord.slice(i * 8, (i+1) * 8),
                    blockTexcoord: data.blockTexcoord.slice(i * 8, (i+1) * 8),
                });
            }
        }
        */
    }

    public registerTriangle(triangle: Triangle) {
        const data = GeometryTemplates.getTriangleBufferData(triangle, this._debug);
        this._registerData(data);
    }

    public registerMesh(mesh: Mesh) {
        this._gl.disable(this._gl.CULL_FACE);

        mesh.materials.forEach((material) => {
            const materialBuffer = new BottomlessBuffer([
                { name: 'position', numComponents: 3 },
                { name: 'texcoord', numComponents: 2 },
                { name: 'normal', numComponents: 3 },
            ]);

            material.faces.forEach((face) => {
                const data = GeometryTemplates.getTriangleBufferData(face, false);
                materialBuffer.add(data);
            });

            this._materialBuffers.push({
                buffer: materialBuffer,
                material: material.materialData,
            });
        });
    }

    registerVoxelMesh() {
        this._gl.enable(this._gl.CULL_FACE);

        const voxelManager = VoxelManager.Get;

        this._atlasSize = BlockAtlas.Get._atlasSize;

        if (this._debug) {
            voxelManager.voxels.forEach((voxel) => {
                this.registerBox(voxel.position);
            });
        } else {
            // Setup arrays for calculating voxel ambient occlusion
            for (let i = 0; i < voxelManager.voxels.length; ++i) {
                const voxel = voxelManager.voxels[i];
                // const colour = voxelManager.voxelColours[i];
                const texcoord = voxelManager.voxelTexcoords[i];
                this._registerVoxel(voxel.position, texcoord);
            }
        }
    }

    clear() {
        this._getNewBuffers();
        this._materialBuffers = [];
    }

    compile() {
        this._registerDebug.compile(this._gl);
        this._registerVoxels.compile(this._gl);

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
            u_voxelSize: VoxelManager.Get.voxelSize,
            u_atlasSize: this._atlasSize,
        });

        // Draw material registers
        const camera = ArcballCamera.Get;
        this._materialBuffers.forEach((materialBuffer) => {
            if (materialBuffer.material.type == MaterialType.Texture) {
                this._drawRegister(materialBuffer.buffer, this._gl.TRIANGLES, ShaderManager.Get.shadedTextureProgram, {
                    u_lightWorldPos: camera.getCameraPosition(0.0, 0.0),
                    u_worldViewProjection: camera.getWorldViewProjection(),
                    u_worldInverseTranspose: camera.getWorldInverseTranspose(),
                    u_texture: materialBuffer.material.texture,
                });
            } else {
                this._drawRegister(materialBuffer.buffer, this._gl.TRIANGLES, ShaderManager.Get.shadedFillProgram, {
                    u_lightWorldPos: camera.getCameraPosition(0.0, 0.0),
                    u_worldViewProjection: camera.getWorldViewProjection(),
                    u_worldInverseTranspose: camera.getWorldInverseTranspose(),
                    u_fillColour: rgbToArray(materialBuffer.material.diffuseColour),
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

        // [Edge, Edge, Corrner]
        const occlusionNeighbours = [
            [
                // +X
                [new Vector3(1, 1, 0), new Vector3(1, 0, -1), new Vector3(1, 1, -1)],
                [new Vector3(1, -1, 0), new Vector3(1, 0, -1), new Vector3(1, -1, -1)],
                [new Vector3(1, 1, 0), new Vector3(1, 0, 1), new Vector3(1, 1, 1)],
                [new Vector3(1, -1, 0), new Vector3(1, 0, 1), new Vector3(1, -1, 1)],
            ],

            [
                // -X
                [new Vector3(-1, 1, 0), new Vector3(-1, 0, 1), new Vector3(-1, 1, 1)],
                [new Vector3(-1, -1, 0), new Vector3(-1, 0, 1), new Vector3(-1, -1, 1)],
                [new Vector3(-1, 1, 0), new Vector3(-1, 0, -1), new Vector3(-1, 1, -1)],
                [new Vector3(-1, -1, 0), new Vector3(-1, 0, -1), new Vector3(-1, -1, -1)],
            ],

            [
                // +Y
                [new Vector3(-1, 1, 0), new Vector3(0, 1, 1), new Vector3(-1, 1, 1)],
                [new Vector3(-1, 1, 0), new Vector3(0, 1, -1), new Vector3(-1, 1, -1)],
                [new Vector3(1, 1, 0), new Vector3(0, 1, 1), new Vector3(1, 1, 1)],
                [new Vector3(1, 1, 0), new Vector3(0, 1, -1), new Vector3(1, 1, -1)],
            ],

            [
                // -Y
                [new Vector3(-1, -1, 0), new Vector3(0, -1, -1), new Vector3(-1, -1, -1)],
                [new Vector3(-1, -1, 0), new Vector3(0, -1, 1), new Vector3(-1, -1, 1)],
                [new Vector3(1, -1, 0), new Vector3(0, -1, -1), new Vector3(1, -1, -1)],
                [new Vector3(1, -1, 0), new Vector3(0, -1, 1), new Vector3(1, -1, 1)],
            ],

            [
                // + Z
                [new Vector3(0, 1, 1), new Vector3(1, 0, 1), new Vector3(1, 1, 1)],
                [new Vector3(0, -1, 1), new Vector3(1, 0, 1), new Vector3(1, -1, 1)],
                [new Vector3(0, 1, 1), new Vector3(-1, 0, 1), new Vector3(-1, 1, 1)],
                [new Vector3(0, -1, 1), new Vector3(-1, 0, 1), new Vector3(-1, -1, 1)],
            ],

            [
                // -Z
                [new Vector3(0, 1, -1), new Vector3(-1, 0, -1), new Vector3(-1, 1, -1)],
                [new Vector3(0, -1, -1), new Vector3(-1, 0, -1), new Vector3(-1, -1, -1)],
                [new Vector3(0, 1, -1), new Vector3(1, 0, -1), new Vector3(1, 1, -1)],
                [new Vector3(0, -1, -1), new Vector3(1, 0, -1), new Vector3(1, -1, -1)],
            ],
        ];

        this._occlusionNeighboursIndices = new Array<Array<Array<number>>>();
        for (let i = 0; i < 6; ++i) {
            const row = new Array<Array<number>>();
            for (let j = 0; j < 4; ++j) {
                row.push(occlusionNeighbours[i][j].map((x) => Renderer._getNeighbourIndex(x)));
            }
            this._occlusionNeighboursIndices.push(row);
        }
        console.log(this._occlusionNeighboursIndices);
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
        twgl.resizeCanvasToDisplaySize(<HTMLCanvasElement> this._gl.canvas);
        this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
        ArcballCamera.Get.aspect = this._gl.canvas.width / this._gl.canvas.height;
        this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA);

        this._gl.enable(this._gl.DEPTH_TEST);
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
            { name: 'colour', numComponents: 3, insertIndex: 0 },
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
            // {name: 'colour', numComponents: 3},
            { name: 'normal', numComponents: 3, insertIndex: 0 },
        ]);
    }
}

module.exports.Renderer = Renderer;
