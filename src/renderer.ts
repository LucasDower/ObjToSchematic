import { Vector3 } from './vector';
import { ArcballCamera } from './camera';
import { ShaderManager } from './shaders';
import { RenderBuffer } from './render_buffer';
import { DebugGeometryTemplates } from './geometry';
import { Mesh, SolidMaterial, TexturedMaterial, MaterialType } from './mesh';
import { VoxelMesh } from './voxel_mesh';
import { BlockMesh } from './block_mesh';

import * as twgl from 'twgl.js';
import { RGBA, RGBAUtil } from './colour';
import { Texture } from './texture';
import { LOG } from './util/log_util';
import { TMeshBufferDescription } from './buffer';
import { RenderBlockMeshParams, RenderMeshParams, RenderVoxelMeshParams } from './worker_types';

/* eslint-disable */
export enum MeshType {
    None,
    TriangleMesh,
    VoxelMesh,
    BlockMesh
}
/* eslint-enable */

/* eslint-disable */
enum EDebugBufferComponents {
    Wireframe,
    Normals,
    Bounds,
    Dev,
}
/* eslint-enable */

export type TextureMaterialRenderAddons = {
    texture: WebGLTexture, alpha?: WebGLTexture, useAlphaChannel?: boolean,
}

export class Renderer {
    public _gl: WebGLRenderingContext;

    private _backgroundColour: RGBA = { r: 0.125, g: 0.125, b: 0.125, a: 1.0 };
    private _atlasTexture?: WebGLTexture;

    private _atlasSize: number = 1.0;
    private _meshToUse: MeshType = MeshType.None;
    private _voxelSize: number = 1.0;
    private _gridOffset: Vector3 = new Vector3(0, 0, 0);

    private _modelsAvailable: number;

    private _materialBuffers: Array<{
        material: SolidMaterial | (TexturedMaterial & TextureMaterialRenderAddons)
        buffer: twgl.BufferInfo,
        numElements: number,
    }>;
    public _voxelBuffer?: twgl.BufferInfo;
    public _voxelBufferRaw?: {[attribute: string]: { numComponents: number, data: Float32Array | Uint32Array }};
    private _blockBuffer?: twgl.BufferInfo;
    private _debugBuffers: { [meshType: string]: { [bufferComponent: string]: RenderBuffer } };
    private _axisBuffer: RenderBuffer;

    private _isGridComponentEnabled: { [bufferComponent: string]: boolean };
    private _axesEnabled: boolean;

    private _gridBuffers: {
        x: { [meshType: string]: RenderBuffer};
        y: { [meshType: string]: RenderBuffer};
        z: { [meshType: string]: RenderBuffer};
    };
    private _gridEnabled: boolean;

    private static _instance: Renderer;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl', {
            alpha: false,
        })!;
        twgl.addExtensionsToContext(this._gl);

        this._modelsAvailable = 0;
        this._materialBuffers = [];

        this._gridBuffers = { x: {}, y: {}, z: {} };
        this._gridEnabled = true;

        this._debugBuffers = {};
        this._debugBuffers[MeshType.None] = {};
        this._debugBuffers[MeshType.TriangleMesh] = {};
        this._debugBuffers[MeshType.VoxelMesh] = {};
        this._debugBuffers[MeshType.BlockMesh] = {};

        this._isGridComponentEnabled = {};
        this._axesEnabled = false;

        this._axisBuffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 4 },
        ]);
        this._axisBuffer.add(DebugGeometryTemplates.arrow(new Vector3(0, 0, 0), new Vector3(1, 0, 0), { r: 0.96, g: 0.21, b: 0.32, a: 1.0 }));
        this._axisBuffer.add(DebugGeometryTemplates.arrow(new Vector3(0, 0, 0), new Vector3(0, 1, 0), { r: 0.44, g: 0.64, b: 0.11, a: 1.0 }));
        this._axisBuffer.add(DebugGeometryTemplates.arrow(new Vector3(0, 0, 0), new Vector3(0, 0, 1), { r: 0.18, g: 0.52, b: 0.89, a: 1.0 }));
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

        this._drawDebug();
    }

    // /////////////////////////////////////////////////////////////////////////

    public toggleIsGridEnabled() {
        this._gridEnabled = !this._gridEnabled;
    }

    public isGridEnabled() {
        return this._gridEnabled;
    }

    public isAxesEnabled() {
        return this._axesEnabled;
    }

    public toggleIsAxesEnabled() {
        this._axesEnabled = !this._axesEnabled;
    }

    public toggleIsWireframeEnabled() {
        const isEnabled = !this._isGridComponentEnabled[EDebugBufferComponents.Wireframe];
        this._isGridComponentEnabled[EDebugBufferComponents.Wireframe] = isEnabled;
    }

    public toggleIsNormalsEnabled() {
        const isEnabled = !this._isGridComponentEnabled[EDebugBufferComponents.Normals];
        this._isGridComponentEnabled[EDebugBufferComponents.Normals] = isEnabled;
    }

    public toggleIsDevDebugEnabled() {
        const isEnabled = !this._isGridComponentEnabled[EDebugBufferComponents.Dev];
        this._isGridComponentEnabled[EDebugBufferComponents.Dev] = isEnabled;
    }

    public clearMesh() {
        this._materialBuffers = [];

        this._modelsAvailable = 0;
        this.setModelToUse(MeshType.None);
    }

    public useMesh(params: RenderMeshParams.Output) {       
        this._materialBuffers = [];

        for (const { material, buffer, numElements } of params.buffers) {
            if (material.type === MaterialType.solid) {
                this._materialBuffers.push({
                    buffer: twgl.createBufferInfoFromArrays(this._gl, buffer),
                    material: material,
                    numElements: numElements,
                });
            } else {
                this._materialBuffers.push({
                    buffer: twgl.createBufferInfoFromArrays(this._gl, buffer),
                    material: {
                        type: MaterialType.textured,
                        path: material.path,
                        texture: twgl.createTexture(this._gl, {
                            src: material.path,
                            mag: this._gl.LINEAR,
                        }),
                        alphaFactor: material.alphaFactor,
                        alpha: material.alphaPath ? twgl.createTexture(this._gl, {
                            src: material.alphaPath,
                            mag: this._gl.LINEAR,
                        }) : undefined,
                        useAlphaChannel: material.alphaPath ? new Texture(material.path, material.alphaPath)._useAlphaChannel() : undefined,
                    },
                    numElements: numElements,
                });
            }
        }

        this._gridBuffers.x[MeshType.TriangleMesh] = DebugGeometryTemplates.gridX(params.dimensions);
        this._gridBuffers.y[MeshType.TriangleMesh] = DebugGeometryTemplates.gridY(params.dimensions);
        this._gridBuffers.z[MeshType.TriangleMesh] = DebugGeometryTemplates.gridZ(params.dimensions);

        this._modelsAvailable = 1;
        this.setModelToUse(MeshType.TriangleMesh);
    }

    public useVoxelMesh(params: RenderVoxelMeshParams.Output) {
        this._voxelBufferRaw = params.buffer.buffer;
        this._voxelBuffer = twgl.createBufferInfoFromArrays(this._gl, params.buffer.buffer);
        this._voxelSize = params.voxelSize;

        const voxelSize = this._voxelSize;
        const dimensions = new Vector3(0, 0, 0);
        dimensions.setFrom(params.dimensions);

        this._gridOffset = new Vector3(
            dimensions.x % 2 === 0 ? 0 : -0.5,
            dimensions.y % 2 === 0 ? 0 : -0.5,
            dimensions.z % 2 === 0 ? 0 : -0.5,
        );
        dimensions.add(1);

        this._gridBuffers.x[MeshType.VoxelMesh] = DebugGeometryTemplates.gridX(Vector3.mulScalar(dimensions, voxelSize), voxelSize);
        this._gridBuffers.y[MeshType.VoxelMesh] = DebugGeometryTemplates.gridY(Vector3.mulScalar(dimensions, voxelSize), voxelSize);
        this._gridBuffers.z[MeshType.VoxelMesh] = DebugGeometryTemplates.gridZ(Vector3.mulScalar(dimensions, voxelSize), voxelSize);
        
        this._modelsAvailable = 2;
        this.setModelToUse(MeshType.VoxelMesh);
    }
    
    public useBlockMesh(params: RenderBlockMeshParams.Output) {
        this._blockBuffer = twgl.createBufferInfoFromArrays(this._gl, params.buffer.buffer);
        
        this._atlasTexture = twgl.createTexture(this._gl, {
            src: params.atlasTexturePath,
            mag: this._gl.NEAREST,
        });
        
        this._atlasSize = params.atlasSize,

        this._gridBuffers.y[MeshType.BlockMesh] = this._gridBuffers.y[MeshType.VoxelMesh];
        
        this._modelsAvailable = 3;
        this.setModelToUse(MeshType.BlockMesh);
    }

    // /////////////////////////////////////////////////////////////////////////

    private _drawDebug() {
        /*
        const debugComponents = [EDebugBufferComponents.GridY];
        for (const debugComp of debugComponents) {
            if (this._isGridComponentEnabled[debugComp]) {
                ASSERT(this._debugBuffers[this._meshToUse]);
                const buffer = this._debugBuffers[this._meshToUse][debugComp];
                if (buffer) {
                    if (debugComp === EDebugBufferComponents.Dev) {
                        this._gl.disable(this._gl.DEPTH_TEST);
                    }
                    if (debugComp === EDebugBufferComponents.GridY && !ArcballCamera.Get.isAlignedWithAxis('y')) {
                        continue;
                    }
                    this._drawBuffer(this._gl.LINES, buffer.getWebGLBuffer(), ShaderManager.Get.debugProgram, {
                        u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    });
                    this._gl.enable(this._gl.DEPTH_TEST);
                }
            }
        }
        */
        // Draw grid
        if (this._gridEnabled) {
            if (ArcballCamera.Get.isAlignedWithAxis('x') && !ArcballCamera.Get.isAlignedWithAxis('y') && !ArcballCamera.Get.isUserRotating) {
                const gridBuffer = this._gridBuffers.x[this._meshToUse];
                if (gridBuffer !== undefined) {
                    this._drawBuffer(this._gl.LINES, gridBuffer.getWebGLBuffer(), ShaderManager.Get.debugProgram, {
                        u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    });
                }
            } else if (ArcballCamera.Get.isAlignedWithAxis('z') && !ArcballCamera.Get.isAlignedWithAxis('y') && !ArcballCamera.Get.isUserRotating) {
                const gridBuffer = this._gridBuffers.z[this._meshToUse];
                if (gridBuffer !== undefined) {
                    this._drawBuffer(this._gl.LINES, gridBuffer.getWebGLBuffer(), ShaderManager.Get.debugProgram, {
                        u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    });
                }
            } else {
                const gridBuffer = this._gridBuffers.y[this._meshToUse];
                if (gridBuffer !== undefined) {
                    this._drawBuffer(this._gl.LINES, gridBuffer.getWebGLBuffer(), ShaderManager.Get.debugProgram, {
                        u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    });
                }
            }
        }

        // Draw axis
        if (this._axesEnabled) {
            this._gl.disable(this._gl.DEPTH_TEST);
            this._drawBuffer(this._gl.LINES, this._axisBuffer.getWebGLBuffer(), ShaderManager.Get.debugProgram, {
                u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
            });
            this._gl.enable(this._gl.DEPTH_TEST);
        }
    }

    public parseRawMeshData(buffer: string, dimensions: Vector3) {
    }

    private _drawMesh() {
        for (const materialBuffer of this._materialBuffers) {
            if (materialBuffer.material.type === MaterialType.textured) {
                this._drawMeshBuffer(materialBuffer.buffer, materialBuffer.numElements, ShaderManager.Get.textureTriProgram, {
                    u_lightWorldPos: ArcballCamera.Get.getCameraPosition(0.0, 0.0),
                    u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    u_worldInverseTranspose: ArcballCamera.Get.getWorldInverseTranspose(),
                    u_texture: materialBuffer.material.texture,
                    u_alpha: materialBuffer.material.alpha || materialBuffer.material.texture,
                    u_useAlphaMap: materialBuffer.material.alpha !== undefined,
                    u_useAlphaChannel: materialBuffer.material.useAlphaChannel,
                    u_alphaFactor: materialBuffer.material.alphaFactor,
                });
            } else {
                this._drawMeshBuffer(materialBuffer.buffer, materialBuffer.numElements, ShaderManager.Get.solidTriProgram, {
                    u_lightWorldPos: ArcballCamera.Get.getCameraPosition(0.0, 0.0),
                    u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    u_worldInverseTranspose: ArcballCamera.Get.getWorldInverseTranspose(),
                    u_fillColour: RGBAUtil.toArray(materialBuffer.material.colour),
                });
            }
        }
    }

    private _drawVoxelMesh() {
        const shader = ShaderManager.Get.voxelProgram;
        const uniforms = {
            u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
            u_voxelSize: this._voxelSize,
            u_gridOffset: this._gridOffset.toArray(),
        };
        if (this._voxelBuffer) {
            this._gl.useProgram(shader.program);
            twgl.setBuffersAndAttributes(this._gl, shader, this._voxelBuffer);
            twgl.setUniforms(shader, uniforms);
            this._gl.drawElements(this._gl.TRIANGLES, this._voxelBuffer.numElements, this._gl.UNSIGNED_INT, 0);
        }
    }

    private _drawBlockMesh() {
        this._gl.enable(this._gl.CULL_FACE);
        const shader = ShaderManager.Get.blockProgram;
        const uniforms = {
            u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
            u_texture: this._atlasTexture,
            u_voxelSize: this._voxelSize,
            u_atlasSize: this._atlasSize,
            u_gridOffset: this._gridOffset.toArray(),
        };
        if (this._blockBuffer) {
            this._gl.useProgram(shader.program);
            twgl.setBuffersAndAttributes(this._gl, shader, this._blockBuffer);
            twgl.setUniforms(shader, uniforms);
            this._gl.drawElements(this._gl.TRIANGLES, this._blockBuffer.numElements, this._gl.UNSIGNED_INT, 0);
        }
        this._gl.disable(this._gl.CULL_FACE);
    }

    // /////////////////////////////////////////////////////////////////////////

    private _drawMeshBuffer(register: twgl.BufferInfo, numElements: number, shaderProgram: twgl.ProgramInfo, uniforms: any) {
        this._drawBuffer(this._gl.TRIANGLES, { buffer: register, numElements: numElements }, shaderProgram, uniforms);
    }

    public setModelToUse(meshType: MeshType) {
        const isModelAvailable = this._modelsAvailable >= meshType;
        if (isModelAvailable) {
            this._meshToUse = meshType;
        }
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

    public getModelsAvailable() {
        return this._modelsAvailable;
    }
    
    public getActiveMeshType() {
        return this._meshToUse;
    }
}
