import { Vector3 } from './vector';
import { ArcballCamera } from './camera';
import { ShaderManager } from './shaders';
import { RenderBuffer } from './buffer';
import { GeometryTemplates } from './geometry';
import { Mesh, SolidMaterial, TexturedMaterial, MaterialType } from './mesh';
import { BlockAtlas } from './block_atlas';
import { LOG, RGB } from './util';
import { VoxelMesh } from './voxel_mesh';
import { BlockMesh } from './block_mesh';

import * as twgl from 'twgl.js';

/* eslint-disable */
enum MeshType {
    None,
    TriangleMesh,
    VoxelMesh,
    BlockMesh
}
/* eslint-enable */

export class Renderer {
    public _gl: WebGLRenderingContext;

    private _backgroundColour = new RGB(0.1, 0.1, 0.1);
    private _atlasTexture?: WebGLTexture;
    private _occlusionNeighboursIndices!: Array<Array<Array<number>>>; // Ew

    private _meshToUse: MeshType = MeshType.None;
    private _voxelSize: number = 1.0;

    public _voxelBuffer: RenderBuffer;
    private _blockBuffer: RenderBuffer;
    private _materialBuffers: Array<{
        buffer: RenderBuffer,
        material: (SolidMaterial | (TexturedMaterial & { texture: WebGLTexture }))
    }>;

    private static _instance: Renderer;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl')!;
        twgl.addExtensionsToContext(this._gl);

        this._setupOcclusions();

        this._voxelBuffer = new RenderBuffer([]);
        this._blockBuffer = new RenderBuffer([]);
        this._materialBuffers = [];
    }

    public update() {
        ArcballCamera.Get.updateCamera();
    }

    public draw() {
        this._setupScene();

        switch (this._meshToUse) {
        case MeshType.TriangleMesh:
            this._drawMesh();
            break;
        case MeshType.VoxelMesh:
            this._drawVoxelMesh();
            break;
        case MeshType.BlockMesh:
            this._drawBlockMesh();
            break;
        };
    }

    // /////////////////////////////////////////////////////////////////////////

    private static _faceNormals = [
        new Vector3(1, 0, 0), new Vector3(-1, 0, 0),
        new Vector3(0, 1, 0), new Vector3(0, -1, 0),
        new Vector3(0, 0, 1), new Vector3(0, 0, -1),
    ];

    // /////////////////////////////////////////////////////////////////////////

    public useMesh(mesh: Mesh) {
        LOG('Using mesh');
        this._materialBuffers = [];
        
        for (const materialName in mesh.materials) {
            const materialBuffer = new RenderBuffer([
                { name: 'position', numComponents: 3 },
                { name: 'texcoord', numComponents: 2 },
                { name: 'normal', numComponents: 3 },
            ]);

            mesh.tris.forEach((tri, triIndex) => {
                if (tri.material === materialName) {
                    if (tri.material === materialName) {
                        const uvTri = mesh.getUVTriangle(triIndex);
                        const triGeom = GeometryTemplates.getTriangleBufferData(uvTri);
                        materialBuffer.add(triGeom);
                    }
                }
            });

            const material = mesh.materials[materialName];
            if (material.type === MaterialType.solid) {
                this._materialBuffers.push({
                    buffer: materialBuffer,
                    material: material,
                });
            } else {
                this._materialBuffers.push({
                    buffer: materialBuffer,
                    material: {
                        type: MaterialType.textured,
                        path: material.path,
                        texture: twgl.createTexture(this._gl, {
                            src: material.path,
                            mag: this._gl.LINEAR,
                        }),
                    },
                });
            }
        }

        this._meshToUse = MeshType.TriangleMesh;
    }
    
    public useVoxelMesh(voxelMesh: VoxelMesh) {
        LOG('Using voxel mesh');
        LOG(voxelMesh);
        this._voxelBuffer = voxelMesh.createBuffer();
        this._meshToUse = MeshType.VoxelMesh;
        this._voxelSize = voxelMesh?.getVoxelSize();
    }
    
    public useBlockMesh(blockMesh: BlockMesh) {
        LOG('Using block mesh');
        LOG(blockMesh);
        this._blockBuffer = blockMesh.createBuffer();
        this._meshToUse = MeshType.BlockMesh;
        this._voxelSize = blockMesh.getVoxelMesh().getVoxelSize();

        this._atlasTexture = twgl.createTexture(this._gl, {
            src: BlockAtlas.Get.getAtlasTexturePath(),
            mag: this._gl.NEAREST,
        });
    }

    // /////////////////////////////////////////////////////////////////////////

    private _drawMesh() {
        for (const materialBuffer of this._materialBuffers) {
            if (materialBuffer.material.type === MaterialType.textured) {
                this._drawRegister(materialBuffer.buffer, ShaderManager.Get.textureTriProgram, {
                    u_lightWorldPos: ArcballCamera.Get.getCameraPosition(0.0, 0.0),
                    u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    u_worldInverseTranspose: ArcballCamera.Get.getWorldInverseTranspose(),
                    u_texture: materialBuffer.material.texture,
                });
            } else {
                this._drawRegister(materialBuffer.buffer, ShaderManager.Get.solidTriProgram, {
                    u_lightWorldPos: ArcballCamera.Get.getCameraPosition(0.0, 0.0),
                    u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    u_worldInverseTranspose: ArcballCamera.Get.getWorldInverseTranspose(),
                    u_fillColour: materialBuffer.material.colour.toArray(),
                });
            }
        }
    }

    private _drawVoxelMesh() {
        this._drawRegister(this._voxelBuffer, ShaderManager.Get.voxelProgram, {
            u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
            u_voxelSize: this._voxelSize,
        });
    }

    private _drawBlockMesh() {
        this._drawRegister(this._blockBuffer, ShaderManager.Get.blockProgram, {
            u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
            u_texture: this._atlasTexture,
            u_voxelSize: this._voxelSize,
            u_atlasSize: BlockAtlas.Get.getAtlasSize(),
        });
    }

    // /////////////////////////////////////////////////////////////////////////

    private _drawRegister(register: RenderBuffer, shaderProgram: twgl.ProgramInfo, uniforms: any) {
        this._drawBuffer(this._gl.TRIANGLES, register.getWebGLBuffer(), shaderProgram, uniforms);
    }

    private _setupOcclusions() {
        // TODO: Find some for-loop to clean this up

        // [Edge, Edge, Corner]
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
    }

    private static _getNeighbourIndex(neighbour: Vector3) {
        return 9*(neighbour.x+1) + 3*(neighbour.y+1) + (neighbour.z+1);
    }

    private _setupScene() {
        twgl.resizeCanvasToDisplaySize(<HTMLCanvasElement> this._gl.canvas);
        this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
        ArcballCamera.Get.aspect = this._gl.canvas.width / this._gl.canvas.height;
        this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA);

        this._gl.enable(this._gl.DEPTH_TEST);
        this._gl.enable(this._gl.BLEND);
        this._gl.clearColor(this._backgroundColour.r, this._backgroundColour.g, this._backgroundColour.b, 1.0);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);
    }

    private _drawBuffer(drawMode: number, buffer: { numElements: number, buffer: twgl.BufferInfo }, shader: twgl.ProgramInfo, uniforms: any) {
        this._gl.useProgram(shader.program);
        twgl.setBuffersAndAttributes(this._gl, shader, buffer.buffer);
        twgl.setUniforms(shader, uniforms);
        this._gl.drawElements(drawMode, buffer.numElements, this._gl.UNSIGNED_INT, 0);
    }
}
