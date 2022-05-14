import { Vector3 } from './vector';
import { ArcballCamera } from './camera';
import { ShaderManager } from './shaders';
import { RenderBuffer } from './buffer';
import { DebugGeometryTemplates, GeometryTemplates } from './geometry';
import { Mesh, SolidMaterial, TexturedMaterial, MaterialType } from './mesh';
import { BlockAtlas } from './block_atlas';
import { ASSERT, LOG, RGB } from './util';
import { VoxelMesh } from './voxel_mesh';
import { BlockMesh } from './block_mesh';

import * as twgl from 'twgl.js';
import { EAppEvent, EventManager } from './event';

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
    Grid,
    Wireframe,
    Normals,
    Bounds,
    Dev,
}
/* eslint-enable */

export class Renderer {
    public _gl: WebGLRenderingContext;

    private _backgroundColour = new RGB(0.125, 0.125, 0.125);
    private _atlasTexture?: WebGLTexture;

    private _meshToUse: MeshType = MeshType.None;
    private _voxelSize: number = 1.0;
    private _gridOffset: Vector3 = new Vector3(0, 0, 0);

    private _modelsAvailable: number;

    private _materialBuffers: Array<{
        buffer: RenderBuffer,
        material: (SolidMaterial | (TexturedMaterial & { texture: WebGLTexture }))
    }>;
    public _voxelBuffer?: twgl.BufferInfo;
    public _voxelBufferRaw?: any;
    private _blockBuffer?: twgl.BufferInfo;
    private _debugBuffers: { [meshType: string]: { [bufferComponent: string]: RenderBuffer } };
    private _axisBuffer: RenderBuffer;

    private _isGridComponentEnabled: { [bufferComponent: string]: boolean };
    private _axesEnabled: boolean;

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

        this._debugBuffers = {};
        this._debugBuffers[MeshType.None] = {};
        this._debugBuffers[MeshType.TriangleMesh] = {};
        this._debugBuffers[MeshType.VoxelMesh] = {};
        this._debugBuffers[MeshType.BlockMesh] = {};

        this._isGridComponentEnabled = {};
        this._isGridComponentEnabled[EDebugBufferComponents.Grid] = false;
        this._axesEnabled = false;

        this._axisBuffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 3 },
        ]);
        this._axisBuffer.add(DebugGeometryTemplates.arrow(new Vector3(0, 0, 0), new Vector3(1, 0, 0), new RGB(0.96, 0.21, 0.32)));
        this._axisBuffer.add(DebugGeometryTemplates.arrow(new Vector3(0, 0, 0), new Vector3(0, 1, 0), new RGB(0.44, 0.64, 0.11)));
        this._axisBuffer.add(DebugGeometryTemplates.arrow(new Vector3(0, 0, 0), new Vector3(0, 0, 1), new RGB(0.18, 0.52, 0.89)));
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
        const isEnabled = !this._isGridComponentEnabled[EDebugBufferComponents.Grid];
        this._isGridComponentEnabled[EDebugBufferComponents.Grid] = isEnabled;
        EventManager.Get.broadcast(EAppEvent.onGridEnabledChanged, isEnabled);
    }

    public toggleIsAxesEnabled() {
        this._axesEnabled = !this._axesEnabled;
        EventManager.Get.broadcast(EAppEvent.onAxesEnabledChanged, this._axesEnabled);
    }

    public toggleIsWireframeEnabled() {
        const isEnabled = !this._isGridComponentEnabled[EDebugBufferComponents.Wireframe];
        this._isGridComponentEnabled[EDebugBufferComponents.Wireframe] = isEnabled;
        EventManager.Get.broadcast(EAppEvent.onWireframeEnabledChanged, isEnabled);
    }

    public toggleIsNormalsEnabled() {
        const isEnabled = !this._isGridComponentEnabled[EDebugBufferComponents.Normals];
        this._isGridComponentEnabled[EDebugBufferComponents.Normals] = isEnabled;
        EventManager.Get.broadcast(EAppEvent.onNormalsEnabledChanged, isEnabled);
    }

    public toggleIsDevDebugEnabled() {
        const isEnabled = !this._isGridComponentEnabled[EDebugBufferComponents.Dev];
        this._isGridComponentEnabled[EDebugBufferComponents.Dev] = isEnabled;
        EventManager.Get.broadcast(EAppEvent.onDevViewEnabledChanged, isEnabled);
    }

    public useMesh(mesh: Mesh) {
        EventManager.Get.broadcast(EAppEvent.onModelAvailableChanged, MeshType.TriangleMesh, false);
        EventManager.Get.broadcast(EAppEvent.onModelAvailableChanged, MeshType.VoxelMesh, false);
        EventManager.Get.broadcast(EAppEvent.onModelAvailableChanged, MeshType.BlockMesh, false);
        
        LOG('Using mesh');
        this._materialBuffers = [];
        
        for (const materialName in mesh.getMaterials()) {
            const materialBuffer = new RenderBuffer([
                { name: 'position', numComponents: 3 },
                { name: 'texcoord', numComponents: 2 },
                { name: 'normal', numComponents: 3 },
            ]);
            
            for (let triIndex = 0; triIndex < mesh.getTriangleCount(); ++triIndex) {
                const material = mesh.getMaterialByTriangle(triIndex);
                if (material === materialName) {
                    const uvTri = mesh.getUVTriangle(triIndex);
                    const triGeom = GeometryTemplates.getTriangleBufferData(uvTri);
                    materialBuffer.add(triGeom);
                }
            }

            const material = mesh.getMaterialByName(materialName);
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
        
        const dimensions = mesh.getBounds().getDimensions();
        this._debugBuffers[MeshType.TriangleMesh][EDebugBufferComponents.Grid] = DebugGeometryTemplates.grid(dimensions);
        this._debugBuffers[MeshType.TriangleMesh][EDebugBufferComponents.Wireframe] = DebugGeometryTemplates.meshWireframe(mesh, new RGB(0.18, 0.52, 0.89));
        this._debugBuffers[MeshType.TriangleMesh][EDebugBufferComponents.Normals] = DebugGeometryTemplates.meshNormals(mesh, new RGB(0.89, 0.52, 0.18));
        delete this._debugBuffers[MeshType.TriangleMesh][EDebugBufferComponents.Dev];

        this._modelsAvailable = 1;
        this.setModelToUse(MeshType.TriangleMesh);

        EventManager.Get.broadcast(EAppEvent.onModelAvailableChanged, MeshType.TriangleMesh, true);
    }
    
    public useVoxelMesh(voxelMesh: VoxelMesh, voxelSize: number, ambientOcclusionEnabled: boolean) {
        EventManager.Get.broadcast(EAppEvent.onModelAvailableChanged, MeshType.VoxelMesh, false);
        EventManager.Get.broadcast(EAppEvent.onModelAvailableChanged, MeshType.BlockMesh, false);

        LOG('Using voxel mesh');
        LOG(voxelMesh);

        this._voxelBufferRaw = voxelMesh.createBuffer(ambientOcclusionEnabled);
        this._voxelBuffer = twgl.createBufferInfoFromArrays(this._gl, this._voxelBufferRaw);
        this._voxelSize = voxelSize;

        const dimensions = voxelMesh.getBounds().getDimensions();
        this._gridOffset = new Vector3(
            dimensions.x % 2 === 0 ? 0 : -0.5,
            dimensions.y % 2 === 0 ? 0 : -0.5,
            dimensions.z % 2 === 0 ? 0 : -0.5,
        );
        dimensions.add(1);

        this._debugBuffers[MeshType.VoxelMesh][EDebugBufferComponents.Grid] = DebugGeometryTemplates.grid(Vector3.mulScalar(dimensions, voxelSize), voxelSize);
        this._debugBuffers[MeshType.VoxelMesh][EDebugBufferComponents.Wireframe] = DebugGeometryTemplates.voxelMeshWireframe(voxelMesh, new RGB(0.18, 0.52, 0.89), this._voxelSize);
        
        this._modelsAvailable = 2;
        this.setModelToUse(MeshType.VoxelMesh);

        EventManager.Get.broadcast(EAppEvent.onModelAvailableChanged, MeshType.VoxelMesh, true);
    }
    
    public useBlockMesh(blockMesh: BlockMesh) {
        EventManager.Get.broadcast(EAppEvent.onModelAvailableChanged, MeshType.BlockMesh, false);

        LOG('Using block mesh');
        LOG(blockMesh);
        this._blockBuffer = twgl.createBufferInfoFromArrays(this._gl, blockMesh.createBuffer());
        
        this._atlasTexture = twgl.createTexture(this._gl, {
            src: BlockAtlas.Get.getAtlasTexturePath(),
            mag: this._gl.NEAREST,
        });
        
        this._debugBuffers[MeshType.BlockMesh][EDebugBufferComponents.Grid] = this._debugBuffers[MeshType.VoxelMesh][EDebugBufferComponents.Grid];
        
        this._modelsAvailable = 3;
        this.setModelToUse(MeshType.BlockMesh);

        EventManager.Get.broadcast(EAppEvent.onModelAvailableChanged, MeshType.BlockMesh, true);
    }

    // /////////////////////////////////////////////////////////////////////////

    private _drawDebug() {
        const debugComponents = [EDebugBufferComponents.Grid, EDebugBufferComponents.Wireframe, EDebugBufferComponents.Normals, EDebugBufferComponents.Dev];
        for (const debugComp of debugComponents) {
            if (this._isGridComponentEnabled[debugComp]) {
                ASSERT(this._debugBuffers[this._meshToUse]);
                const buffer = this._debugBuffers[this._meshToUse][debugComp];
                if (buffer) {
                    if (debugComp === EDebugBufferComponents.Dev) {
                        this._gl.disable(this._gl.DEPTH_TEST);
                    }
                    this._drawBuffer(this._gl.LINES, buffer.getWebGLBuffer(), ShaderManager.Get.debugProgram, {
                        u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    });
                    this._gl.enable(this._gl.DEPTH_TEST);
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
        const shader = ShaderManager.Get.blockProgram;
        const uniforms = {
            u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
            u_texture: this._atlasTexture,
            u_voxelSize: this._voxelSize,
            u_atlasSize: BlockAtlas.Get.getAtlasSize(),
            u_gridOffset: this._gridOffset.toArray(),
        };
        if (this._blockBuffer) {
            this._gl.useProgram(shader.program);
            twgl.setBuffersAndAttributes(this._gl, shader, this._blockBuffer);
            twgl.setUniforms(shader, uniforms);
            this._gl.drawElements(this._gl.TRIANGLES, this._blockBuffer.numElements, this._gl.UNSIGNED_INT, 0);
        }
    }

    // /////////////////////////////////////////////////////////////////////////

    private _drawRegister(register: RenderBuffer, shaderProgram: twgl.ProgramInfo, uniforms: any) {
        this._drawBuffer(this._gl.TRIANGLES, register.getWebGLBuffer(), shaderProgram, uniforms);
    }

    public setModelToUse(meshType: MeshType) {
        const isModelAvailable = this._modelsAvailable >= meshType;
        if (isModelAvailable) {
            this._meshToUse = meshType;
            EventManager.Get.broadcast(EAppEvent.onModelActiveChanged, meshType);
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
