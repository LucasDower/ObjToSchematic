import * as twgl from 'twgl.js';

import VANILLA_TEXTURE from '../../../res/atlases/vanilla.png';
import { Bounds } from '../../runtime/bounds';
import { ArcballCamera } from './camera';
import { RGBA, RGBAUtil } from '../../runtime/colour';
import { AppConfig } from '../config';
import { DebugGeometryTemplates } from './geometry';
import { MaterialType, SolidMaterial, TexturedMaterial } from '../../runtime/mesh';
import { RenderBuffer } from './render_buffer';
import { ShaderManager } from './shaders';
import { EImageChannel } from '../../runtime/texture';
import { ASSERT } from '../../runtime/util/error_util';
import { Vector3 } from '../../runtime/vector';
import { RenderMeshParams, RenderNextBlockMeshChunkParams, RenderNextVoxelMeshChunkParams } from '../worker/worker_types';
import { UIUtil } from '../../runtime/util/ui_util';
import { TAxis } from '../../runtime/util/type_util';
import { Atlas } from '../../runtime/atlas';

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

/**
 * Dedicated type for passing to shaders for solid materials
 */
type InternalSolidMaterial = {
    type: MaterialType.solid,
    colourArray: number[],
}

/**
 * Dedicated type for passing to shaders for textured materials
 */
type InternalTextureMaterial = {
    type: MaterialType.textured,
    diffuseTexture: WebGLTexture,
    // The texture to sample alpha values from (if is using a texture map)
    alphaTexture: WebGLTexture,
    // What texture channel to sample the alpha value from
    alphaChannel: EImageChannel,
    // What alpha value to use (only used if using constant transparency mode)
    alphaValue: number,
};

export class Renderer {
    public _gl: WebGL2RenderingContext;

    private _backgroundColour: RGBA = { r: 0.125, g: 0.125, b: 0.125, a: 1.0 };
    private _atlasTexture?: WebGLTexture;

    private _atlasSize: number = 1.0;
    private _meshToUse: MeshType = MeshType.None;
    private _voxelSize: number = 1.0;
    private _gridOffset: Vector3 = new Vector3(0, 0, 0);
    private _sliceHeight: number = 0.0;

    private _modelsAvailable: number;

    private _materialBuffers: Map<string, {
        material: InternalSolidMaterial | InternalTextureMaterial,
        buffer: twgl.BufferInfo,
        numElements: number,
        materialName: string,
    }>;
    public _voxelBuffer?: twgl.BufferInfo[];
    private _blockBuffer?: twgl.BufferInfo[];
    private _blockBounds: Bounds;
    private _axisBuffer: RenderBuffer;

    private _axisHighlightBuffer: {
        x: { enabled: boolean, buffer: RenderBuffer },
        y: { enabled: boolean, buffer: RenderBuffer },
        z: { enabled: boolean, buffer: RenderBuffer },
    }

    private _isGridComponentEnabled: { [bufferComponent: string]: boolean };
    private _axesEnabled: boolean;
    private _nightVisionEnabled: boolean;
    private _sliceViewEnabled: boolean;

    private _gridBuffers: {
        x: { [meshType: string]: RenderBuffer };
        y: { [meshType: string]: RenderBuffer };
        z: { [meshType: string]: RenderBuffer };
    };
    private _gridEnabled: boolean;

    private static _instance: Renderer;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const webgl2Context = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl2', {
            alpha: false,
        });

        if (webgl2Context === null) {
            throw 'Could not get WebGL2';
        }

        this._gl = webgl2Context;
        twgl.addExtensionsToContext(this._gl);

        this._backgroundColour = AppConfig.Get.VIEWPORT_BACKGROUND_COLOUR;

        const atlas = Atlas.load('vanilla');
        ASSERT(atlas !== undefined);
        this._atlasSize = atlas.getAtlasSize();


        this._modelsAvailable = 0;
        this._materialBuffers = new Map();

        this._gridBuffers = { x: {}, y: {}, z: {} };
        this._gridEnabled = false;

        this._isGridComponentEnabled = {};
        this._axesEnabled = true;
        this._nightVisionEnabled = true;
        this._sliceViewEnabled = false;

        this._blockBounds = new Bounds(new Vector3(0, 0, 0), new Vector3(0, 0, 0));

        this._axisBuffer = new RenderBuffer([
            { name: 'position', numComponents: 3 },
            { name: 'colour', numComponents: 4 },
        ]);
        this._axisBuffer.add(DebugGeometryTemplates.arrow(new Vector3(0, 0, 0), new Vector3(0.125, 0, 0), { r: 0.96, g: 0.21, b: 0.32, a: 1.0 }));
        this._axisBuffer.add(DebugGeometryTemplates.arrow(new Vector3(0, 0, 0), new Vector3(0, 0.125, 0), { r: 0.44, g: 0.64, b: 0.11, a: 1.0 }));
        this._axisBuffer.add(DebugGeometryTemplates.arrow(new Vector3(0, 0, 0), new Vector3(0, 0, 0.125), { r: 0.18, g: 0.52, b: 0.89, a: 1.0 }));

        const resizeObserver = new ResizeObserver(() => {
            this.forceRedraw();
        });

        resizeObserver.observe(UIUtil.getElementById('canvas'));

        {
            this._axisHighlightBuffer = {
                x: {
                    enabled: false, buffer: new RenderBuffer([
                        { name: 'position', numComponents: 3 },
                        { name: 'colour', numComponents: 4 },
                    ])
                },
                y: {
                    enabled: false, buffer: new RenderBuffer([
                        { name: 'position', numComponents: 3 },
                        { name: 'colour', numComponents: 4 },
                    ])
                },
                z: {
                    enabled: false, buffer: new RenderBuffer([
                        { name: 'position', numComponents: 3 },
                        { name: 'colour', numComponents: 4 },
                    ])
                },
            }

            this._axisHighlightBuffer.x.buffer.add(DebugGeometryTemplates.line(new Vector3(-10, 0, 0), new Vector3(10, 0, 0), { r: 0.96, g: 0.21, b: 0.32, a: 1.0 }));
            this._axisHighlightBuffer.y.buffer.add(DebugGeometryTemplates.line(new Vector3(0, -10, 0), new Vector3(0, 10, 0), { r: 0.44, g: 0.64, b: 0.11, a: 1.0 }));
            this._axisHighlightBuffer.z.buffer.add(DebugGeometryTemplates.line(new Vector3(0, 0, -10), new Vector3(0, 0, 10), { r: 0.18, g: 0.52, b: 0.89, a: 1.0 }));
        }
    }

    public update() {
        ArcballCamera.Get.updateCamera();
    }

    private _redraw = true;
    public forceRedraw() {
        this._redraw = true;
    }

    public draw() {
        if (this._redraw || ArcballCamera.Get.isUserRotating || ArcballCamera.Get.isUserTranslating) {
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
            this._redraw = false;
        }
    }

    // /////////////////////////////////////////////////////////////////////////

    public isSliceViewerEnabled() {
        return this._sliceViewEnabled && this._meshToUse === MeshType.BlockMesh;
    }

    public toggleSliceViewerEnabled() {
        this._sliceViewEnabled = !this._sliceViewEnabled;
        this.forceRedraw();
    }

    public canIncrementSliceHeight() {
        return this._blockBounds.max.y > this._sliceHeight;

    }

    public canDecrementSliceHeight() {
        return this._blockBounds.min.y < this._sliceHeight;
    }

    public incrementSliceHeight() {
        if (this.canIncrementSliceHeight()) {
            ++this._sliceHeight;
            this.forceRedraw();
        }
    }

    public decrementSliceHeight() {
        if (this.canDecrementSliceHeight()) {
            --this._sliceHeight;
            this.forceRedraw();
        }
    }

    private _lightingAvailable: boolean = false;
    public setLightingAvailable(isAvailable: boolean) {
        this._lightingAvailable = isAvailable;
        if (!isAvailable) {
            this._nightVisionEnabled = true;
        }
    }

    public toggleIsGridEnabled() {
        this._gridEnabled = !this._gridEnabled;
        this.forceRedraw();
    }

    public isGridEnabled() {
        return this._gridEnabled;
    }

    public isAxesEnabled() {
        return this._axesEnabled;
    }

    public toggleIsAxesEnabled() {
        this._axesEnabled = !this._axesEnabled;
        this.forceRedraw();
    }

    public canToggleNightVision() {
        return this._lightingAvailable;
    }

    public toggleIsNightVisionEnabled() {
        this._nightVisionEnabled = !this._nightVisionEnabled;
        if (!this._lightingAvailable) {
            this._nightVisionEnabled = true;
        }
        this.forceRedraw();
    }

    public isNightVisionEnabled() {
        return this._nightVisionEnabled;
    }

    public toggleIsWireframeEnabled() {
        const isEnabled = !this._isGridComponentEnabled[EDebugBufferComponents.Wireframe];
        this._isGridComponentEnabled[EDebugBufferComponents.Wireframe] = isEnabled;
        this.forceRedraw();
    }

    public toggleIsNormalsEnabled() {
        const isEnabled = !this._isGridComponentEnabled[EDebugBufferComponents.Normals];
        this._isGridComponentEnabled[EDebugBufferComponents.Normals] = isEnabled;
        this.forceRedraw();
    }

    public toggleIsDevDebugEnabled() {
        const isEnabled = !this._isGridComponentEnabled[EDebugBufferComponents.Dev];
        this._isGridComponentEnabled[EDebugBufferComponents.Dev] = isEnabled;
        this.forceRedraw();
    }

    public initAtlas() {
        const atlas = Atlas.load('vanilla');
        ASSERT(atlas !== undefined, 'Could not load atlas');

        this._atlasSize = atlas.getAtlasSize();
        this._atlasTexture = twgl.createTexture(this._gl, {
            src: VANILLA_TEXTURE,
            mag: this._gl.NEAREST,
        }, () => {
            this.forceRedraw();
        });
    }

    public clearMesh() {
        this._materialBuffers = new Map();

        this._modelsAvailable = 0;
        this.setModelToUse(MeshType.None);
    }

    private _createInternalMaterial(material: SolidMaterial | TexturedMaterial): (InternalSolidMaterial | InternalTextureMaterial) {
        if (material.type === MaterialType.solid) {
            return {
                type: MaterialType.solid,
                colourArray: RGBAUtil.toArray(material.colour),
            };
        } else {
            const blankTexture = twgl.createTexture(this._gl, {
                min: this._gl.NEAREST,
                mag: this._gl.NEAREST,
                src: [
                    255, 0, 255, 255,
                ],
            }, () => {
                this.forceRedraw();
            });

            let diffuseTexture = blankTexture;
            let alphaTexture = diffuseTexture;

            if (material.diffuse !== undefined && material.diffuse.raw !== '') {
                diffuseTexture = twgl.createTexture(this._gl, {
                    src: material.diffuse?.raw, // TODO Unimplemented
                    min: material.interpolation === 'linear' ? this._gl.LINEAR : this._gl.NEAREST,
                    mag: material.interpolation === 'linear' ? this._gl.LINEAR : this._gl.NEAREST,
                    wrap: material.extension === 'clamp' ? this._gl.CLAMP_TO_EDGE : this._gl.REPEAT,
                }, () => {
                    this.forceRedraw();
                });
            }

            if (material.transparency.type === 'UseAlphaMap') {
                alphaTexture = blankTexture;
                if (material.transparency.alpha !== undefined && material.transparency.alpha.raw !== '') {
                    alphaTexture = twgl.createTexture(this._gl, {
                        src: material.transparency.alpha.raw, // TODO Unimplemented
                        min: material.interpolation === 'linear' ? this._gl.LINEAR : this._gl.NEAREST,
                        mag: material.interpolation === 'linear' ? this._gl.LINEAR : this._gl.NEAREST,
                        wrap: material.extension === 'clamp' ? this._gl.CLAMP_TO_EDGE : this._gl.REPEAT,
                    }, () => {
                        this.forceRedraw();
                    });
                }
            }

            const alphaValue = material.transparency.type === 'UseAlphaValue' ?
                material.transparency.alpha : 1.0;

            let alphaChannel: EImageChannel = EImageChannel.MAX;
            switch (material.transparency.type) {
                case 'UseAlphaValue':
                    alphaChannel = EImageChannel.MAX;
                    break;
                case 'UseDiffuseMapAlphaChannel':
                    alphaChannel = EImageChannel.A;
                    break;
                case 'UseAlphaMap':
                    alphaChannel = material.transparency.channel;
                    break;
            }

            return {
                type: MaterialType.textured,
                diffuseTexture: diffuseTexture,
                alphaTexture: alphaTexture,
                alphaValue: alphaValue,
                alphaChannel: alphaChannel,
            };
        }
    }

    public recreateMaterialBuffer(materialName: string, material: SolidMaterial | TexturedMaterial) {
        const oldBuffer = this._materialBuffers.get(materialName);
        ASSERT(oldBuffer !== undefined);

        const internalMaterial = this._createInternalMaterial(material);
        this._materialBuffers.set(materialName, {
            buffer: oldBuffer.buffer,
            material: internalMaterial,
            numElements: oldBuffer.numElements,
            materialName: materialName,
        });
    }

    public useMesh(params: RenderMeshParams.Output) {
        this._materialBuffers = new Map();

        for (const { material, buffer, numElements, materialName } of params.buffers) {
            const internalMaterial = this._createInternalMaterial(material);
            this._materialBuffers.set(materialName, {
                buffer: twgl.createBufferInfoFromArrays(this._gl, buffer),
                material: internalMaterial,
                numElements: numElements,
                materialName: materialName,
            });
        }

        this._gridBuffers.x[MeshType.TriangleMesh] = DebugGeometryTemplates.gridX(params.dimensions);
        this._gridBuffers.y[MeshType.TriangleMesh] = DebugGeometryTemplates.gridY(params.dimensions);
        this._gridBuffers.z[MeshType.TriangleMesh] = DebugGeometryTemplates.gridZ(params.dimensions);

        this._modelsAvailable = 1;
        this.setModelToUse(MeshType.TriangleMesh);
    }

    private _allVoxelChunks = false;
    public useVoxelMeshChunk(params: RenderNextVoxelMeshChunkParams.Output) {
        if (params.isFirstChunk) {
            this._voxelBuffer = [];
        }

        this._allVoxelChunks = !params.moreVoxelsToBuffer;

        this._voxelBuffer?.push(twgl.createBufferInfoFromArrays(this._gl, params.buffer.buffer));
        this._voxelSize = params.voxelSize;

        if (params.isFirstChunk) {
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

        this.forceRedraw();
    }

    public useBlockMeshChunk(params: RenderNextBlockMeshChunkParams.Output) {
        ASSERT(this._atlasTexture !== undefined, 'Atlas texture not initialised');

        if (params.isFirstChunk) {
            this._blockBuffer = [];

            // re-create objects, due to serialization.
            const min = new Vector3(0, 0, 0);
            const max = new Vector3(0, 0, 0);
            min.setFrom(params.bounds['_min']);
            max.setFrom(params.bounds['_max']);

            this._blockBounds = new Bounds(min, max);
            this._sliceHeight = this._blockBounds.min.y;
        }

        this._blockBuffer?.push(twgl.createBufferInfoFromArrays(this._gl, params.buffer.buffer));

        if (params.isFirstChunk) {


            this._gridBuffers.y[MeshType.BlockMesh] = this._gridBuffers.y[MeshType.VoxelMesh];

            this._modelsAvailable = 3;
            this.setModelToUse(MeshType.BlockMesh);
        }

        this.forceRedraw();
    }

    // /////////////////////////////////////////////////////////////////////////

    public setAxisToHighlight(axis: TAxis) {
        this.clearAxisToHighlight();
        this._axisHighlightBuffer[axis].enabled = true;
        this.forceRedraw();
    }

    public clearAxisToHighlight() {
        this._axisHighlightBuffer.x.enabled = false;
        this._axisHighlightBuffer.y.enabled = false;
        this._axisHighlightBuffer.z.enabled = false;
        this.forceRedraw();
    }

    private _drawDebug() {
        // Draw debug modes
        {
            //this._gl.disable(this._gl.DEPTH_TEST);
            const axes: TAxis[] = ['x', 'y', 'z'];
            axes.forEach((axis) => {
                if (this._axisHighlightBuffer[axis].enabled) {
                    this._drawBuffer(this._gl.LINES, this._axisHighlightBuffer[axis].buffer.getWebGLBuffer(), ShaderManager.Get.debugProgram, {
                        u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    });
                }
            })
            //this._gl.enable(this._gl.DEPTH_TEST);
        }

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
                        u_worldOffset: [0, this._sliceViewEnabled ? this._sliceHeight * this._voxelSize: 0, 0],
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

    private _drawMesh() {
        this._materialBuffers.forEach((materialBuffer, materialName) => {
            if (materialBuffer.material.type === MaterialType.textured) {
                this._drawMeshBuffer(materialBuffer.buffer, materialBuffer.numElements, ShaderManager.Get.textureTriProgram, {
                    u_lightWorldPos: ArcballCamera.Get.getCameraPosition(-Math.PI/4, 0.0).toArray(),
                    u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    u_worldInverseTranspose: ArcballCamera.Get.getWorldInverseTranspose(),
                    u_texture: materialBuffer.material.diffuseTexture,
                    u_alpha: materialBuffer.material.alphaTexture ?? materialBuffer.material.diffuseTexture,
                    u_alphaChannel: materialBuffer.material.alphaChannel,
                    u_alphaFactor: materialBuffer.material.alphaValue,
                    u_cameraDir: ArcballCamera.Get.getCameraDirection().toArray(),
                    u_fresnelExponent: AppConfig.Get.FRESNEL_EXPONENT,
                    u_fresnelMix: AppConfig.Get.FRESNEL_MIX,
                });
            } else {
                this._drawMeshBuffer(materialBuffer.buffer, materialBuffer.numElements, ShaderManager.Get.solidTriProgram, {
                    u_lightWorldPos: ArcballCamera.Get.getCameraPosition(-Math.PI/4, 0.0).toArray(),
                    u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
                    u_worldInverseTranspose: ArcballCamera.Get.getWorldInverseTranspose(),
                    u_fillColour: materialBuffer.material.colourArray,
                    u_cameraDir: ArcballCamera.Get.getCameraDirection().toArray(),
                    u_fresnelExponent: AppConfig.Get.FRESNEL_EXPONENT,
                    u_fresnelMix: AppConfig.Get.FRESNEL_MIX,
                });
            }
        });
    }

    private _drawVoxelMesh() {
        const shader = ShaderManager.Get.voxelProgram;
        const uniforms = {
            u_worldViewProjection: ArcballCamera.Get.getWorldViewProjection(),
            u_voxelSize: this._voxelSize,
            u_gridOffset: this._gridOffset.toArray(),
            u_ambientOcclusion: this._allVoxelChunks,
        };
        this._voxelBuffer?.forEach((buffer) => {
            this._gl.useProgram(shader.program);
            twgl.setBuffersAndAttributes(this._gl, shader, buffer);
            twgl.setUniforms(shader, uniforms);
            this._gl.drawElements(this._gl.TRIANGLES, buffer.numElements, this._gl.UNSIGNED_INT, 0);
        });
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
            u_nightVision: this.isNightVisionEnabled(),
            u_sliceHeight: this._sliceViewEnabled ? this._sliceHeight : Infinity,
        };
        this._blockBuffer?.forEach((buffer) => {
            this._gl.useProgram(shader.program);
            twgl.setBuffersAndAttributes(this._gl, shader, buffer);
            twgl.setUniforms(shader, uniforms);
            this._gl.drawElements(this._gl.TRIANGLES, buffer.numElements, this._gl.UNSIGNED_INT, 0);
        });
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
        this.forceRedraw();
    }

    private _setupScene() {
        twgl.resizeCanvasToDisplaySize(<HTMLCanvasElement>this._gl.canvas);
        this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
        ArcballCamera.Get.setAspect(this._gl.canvas.width / this._gl.canvas.height);
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
