import { remote } from 'electron';
import path from 'path';

import { FallableBehaviour } from './block_mesh';
import { ArcballCamera } from './camera';
import { RGBA, RGBAUtil } from './colour';
import { AppConfig } from './config';
import { EAppEvent, EventManager } from './event';
import { IExporter } from './exporters/base_exporter';
import { ExporterFactory, TExporters } from './exporters/exporters';
import { MaterialMap, MaterialType, SolidMaterial, TexturedMaterial } from './mesh';
import { Renderer } from './renderer';
import { StatusHandler, StatusMessage } from './status';
import { TextureFiltering } from './texture';
import { SolidMaterialUIElement, TextureMaterialUIElement } from './ui/elements/material';
import { OutputStyle } from './ui/elements/output';
import { UI } from './ui/layout';
import { UIMessageBuilder, UITreeBuilder } from './ui/misc';
import { ColourSpace, EAction } from './util';
import { ASSERT } from './util/error_util';
import { LOG_ERROR, Logger } from './util/log_util';
import { AppPaths, PathUtil } from './util/path_util';
import { Vector3 } from './vector';
import { TWorkerJob, WorkerController } from './worker_controller';
import { SetMaterialsParams, TFromWorkerMessage, TToWorkerMessage } from './worker_types';

export class AppContext {
    private _ui: UI;
    private _workerController: WorkerController;
    private _lastAction?: EAction;
    public maxConstraint?: Vector3;
    private _materialMap: MaterialMap;

    public constructor() {
        this._materialMap = {};

        Logger.Get.enableLogToFile();
        Logger.Get.initLogFile('client');
        Logger.Get.enableLOG();
        Logger.Get.enableLOGMAJOR();
        Logger.Get.enableLOGWARN();

        AppConfig.Get.dumpConfig();

        const gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl');
        if (!gl) {
            throw Error('Could not load WebGL context');
        }

        this._ui = new UI(this);
        this._ui.build();
        this._ui.registerEvents();
        this._ui.disable(EAction.Voxelise);

        this._workerController = new WorkerController(path.resolve(__dirname, 'worker_interface.js'));
        this._workerController.addJob({ id: 'init', payload: { action: 'Init', params: {} } });

        Renderer.Get.toggleIsAxesEnabled();
        ArcballCamera.Get.setCameraMode('perspective');
        ArcballCamera.Get.toggleAngleSnap();

        EventManager.Get.add(EAppEvent.onTaskStart, (...data) => {
            if (this._lastAction) {
                this._ui.getActionButton(this._lastAction)
                    .startLoading()
                    .setProgress(0.0);
            }
        });

        EventManager.Get.add(EAppEvent.onTaskProgress, (...data) => {
            if (this._lastAction) {
                this._ui.getActionButton(this._lastAction)
                    .setProgress(data[0][1]);
            }
        });

        EventManager.Get.add(EAppEvent.onTaskEnd, (...data) => {
            if (this._lastAction) {
                this._ui.getActionButton(this._lastAction)
                    .stopLoading()
                    .setProgress(0.0);
            }
        });
    }

    public do(action: EAction) {
        this._ui.cacheValues(action);
        this._ui.disable(action);
        this._ui.disableAll();

        const workerJob = this._getWorkerJob(action);
        if (workerJob === undefined) {
            this._ui.enableTo(action);
            return;
        }

        const uiOutput = this._ui.getActionOutput(action);

        const jobCallback = (payload: TFromWorkerMessage) => {
            //this._ui.enableTo(action);
            switch (payload.action) {
                case 'KnownError':
                case 'UnknownError': {
                    uiOutput.setTaskComplete(
                        'action',
                        StatusHandler.Get.getDefaultFailureMessage(action),
                        [payload.action === 'KnownError' ? payload.error.message : 'Something unexpectedly went wrong'],
                        'error',
                    );
                    LOG_ERROR(payload.error);

                    this._ui.getActionButton(action)
                        .stopLoading()
                        .setProgress(0.0);

                    this._ui.enableTo(action);
                    break;
                }
                default: {
                    //this._ui.enableTo(action + 1);

                    ASSERT(payload.action !== 'Progress');
                    const { builder, style } = this._getActionMessageBuilder(action, payload.statusMessages);
                    uiOutput.setMessage(builder, style as OutputStyle);

                    if (workerJob.callback) {
                        workerJob.callback(payload);
                    }
                }
            }
        };

        this._lastAction = action;

        this._workerController.addJob({
            id: workerJob.id,
            payload: workerJob.payload,
            callback: jobCallback,
        });
    }

    private _getActionMessageBuilder(action: EAction, statusMessages: StatusMessage[]) {
        const infoStatuses = statusMessages
            .filter((x) => x.status === 'info')
            .map((x) => x.message);
        const hasInfos = infoStatuses.length > 0;

        const warningStatuses = statusMessages
            .filter((x) => x.status === 'warning')
            .map((x) => x.message);
        const hasWarnings = warningStatuses.length > 0;

        const builder = new UIMessageBuilder();
        builder.addBold('action', [StatusHandler.Get.getDefaultSuccessMessage(action) + (hasInfos ? ':' : '')], 'success');

        builder.addItem('action', infoStatuses, 'none');
        builder.addItem('action', warningStatuses, 'warning');

        return { builder: builder, style: hasWarnings ? 'warning' : 'success' };
    }

    private _getWorkerJob(action: EAction): (TWorkerJob | undefined) {
        switch (action) {
            case EAction.Import:
                return this._import();
            case EAction.Voxelise:
                return this._voxelise();
            case EAction.Assign:
                return this._assign();
            case EAction.Export:
                return this._export();
        }
        ASSERT(false);
    }

    private _import(): TWorkerJob {
        const uiElements = this._ui.layout.import.elements;

        this._ui.getActionOutput(EAction.Import)
            .setTaskInProgress('action', '[Importer]: Loading...');

        const payload: TToWorkerMessage = {
            action: 'Import',
            params: {
                filepath: uiElements.input.getCachedValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            ASSERT(payload.action === 'Import');
            const outputElement = this._ui.getActionOutput(EAction.Import);

            const dimensions = new Vector3(
                payload.result.dimensions.x,
                payload.result.dimensions.y,
                payload.result.dimensions.z,
            );
            dimensions.mulScalar(380 / 8.0).floor();
            this.maxConstraint = dimensions;
            this._materialMap = payload.result.materials;
            this._onMaterialMapChanged();

            if (payload.result.triangleCount < AppConfig.Get.RENDER_TRIANGLE_THRESHOLD) {
                outputElement.setTaskInProgress('render', '[Renderer]: Processing...');
                this._workerController.addJob(this._renderMesh());
            } else {
                const message = `Will not render mesh as its over ${AppConfig.Get.RENDER_TRIANGLE_THRESHOLD.toLocaleString()} triangles.`;
                outputElement.setTaskComplete('render', '[Renderer]: Stopped', [message], 'warning');
            }
        };

        return { id: 'Import', payload: payload, callback: callback };
    }

    private _sendMaterialsToWorker(callback: (result: SetMaterialsParams.Output) => void) {
        const payload: TToWorkerMessage = {
            action: 'SetMaterials',
            params: {
                materials: this._materialMap,
            },
        };
        const job: TWorkerJob = {
            id: 'SetMaterial',
            payload: payload,
            callback: (result: TFromWorkerMessage) => {
                ASSERT(result.action === 'SetMaterials');
                // TODO: Check the action didn't fail
                this._materialMap = result.result.materials;
                this._onMaterialMapChanged();
                this._ui.enableTo(EAction.Voxelise);
                callback(result.result);
            },
        };

        this._workerController.addJob(job);
        this._ui.disableAll();
    }

    public onMaterialTypeSwitched(materialName: string) {
        const oldMaterial = this._materialMap[materialName];

        if (oldMaterial.type == MaterialType.textured) {
            this._materialMap[materialName] = {
                type: MaterialType.solid,
                colour: RGBAUtil.random(),
                edited: true,
                canBeTextured: oldMaterial.canBeTextured,
                set: false,
            };
        } else {
            this._materialMap[materialName] = {
                type: MaterialType.textured,
                alphaFactor: 1.0,
                path: PathUtil.join(AppPaths.Get.static, 'debug.png'),
                edited: true,
                canBeTextured: oldMaterial.canBeTextured,
            };
        }

        this._sendMaterialsToWorker((result: SetMaterialsParams.Output) => {
            // TODO: Check the action didn't fail
            Renderer.Get.recreateMaterialBuffer(materialName, result.materials[materialName]);
        });
    }

    public onMaterialTextureReplace(materialName: string, newTexturePath: string) {
        const oldMaterial = this._materialMap[materialName];
        ASSERT(oldMaterial.type === MaterialType.textured);

        this._materialMap[materialName] = {
            type: MaterialType.textured,
            alphaFactor: oldMaterial.alphaFactor,
            alphaPath: oldMaterial.alphaPath,
            path: newTexturePath,
            edited: true,
            canBeTextured: oldMaterial.canBeTextured,
        };

        this._sendMaterialsToWorker((result: SetMaterialsParams.Output) => {
            Renderer.Get.updateMeshMaterialTexture(materialName, result.materials[materialName] as TexturedMaterial);
        });
    }

    public onMaterialColourChanged(materialName: string, newColour: RGBA) {
        ASSERT(this._materialMap[materialName].type === MaterialType.solid);
        const oldMaterial = this._materialMap[materialName] as TexturedMaterial;
        this._materialMap[materialName] = {
            type: MaterialType.solid,
            colour: newColour,
            edited: true,
            canBeTextured: oldMaterial.canBeTextured,
            set: true,
        };

        this._sendMaterialsToWorker((result: SetMaterialsParams.Output) => {
            Renderer.Get.recreateMaterialBuffer(materialName, result.materials[materialName] as SolidMaterial);
        });
    }

    private _onMaterialMapChanged() {
        // Add material information to the output log
        const outputElement = this._ui.getActionOutput(EAction.Import);

        const messageBuilder = outputElement.getMessage();
        const tree = UITreeBuilder.create('Materials');

        for (const [materialName, material] of Object.entries(this._materialMap)) {
            if (materialName === 'DEFAULT_UNASSIGNED') {
                continue;
            }

            const subTree = UITreeBuilder.create(material.edited ? `<i>'${materialName}'*</i>` : `'${materialName}'`);
            if (material.type === MaterialType.solid) {
                const uiElement = new SolidMaterialUIElement(materialName, this, material);

                subTree.addChild({ html: uiElement.buildHTML(), warning: uiElement.hasWarning()}, () => {
                    uiElement.registerEvents();
                });
            } else {
                const uiElement = new TextureMaterialUIElement(materialName, this, material);

                subTree.addChild({ html: uiElement.buildHTML(), warning: uiElement.hasWarning()}, () => {
                    uiElement.registerEvents();
                });
            }

            tree.addChild(subTree);
        }

        messageBuilder.setTree('materials', tree);
        outputElement.updateMessage();
    }

    private _renderMesh(): TWorkerJob {
        const payload: TToWorkerMessage = {
            action: 'RenderMesh',
            params: {},
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is not managed through `AppContext::do`, therefore
            // we need to check the payload is not an error
            this._ui.enableTo(EAction.Voxelise);

            switch (payload.action) {
                case 'KnownError':
                case 'UnknownError': {
                    this._ui.getActionOutput(EAction.Import).setTaskComplete(
                        'render',
                        '[Renderer]: Failed',
                        [payload.action === 'KnownError' ? payload.error.message : 'Something unexpectedly went wrong'],
                        'error',
                    );
                    LOG_ERROR(payload.error);
                    break;
                }
                default: {
                    ASSERT(payload.action === 'RenderMesh');
                    Renderer.Get.useMesh(payload.result);

                    this._ui.getActionOutput(EAction.Import).setTaskComplete(
                        'render',
                        '[Renderer]: Succeeded',
                        [],
                        'success',
                    );
                }
            }
        };

        return { id: 'RenderMesh', payload: payload, callback: callback };
    }

    private _voxelise(): TWorkerJob {
        const uiElements = this._ui.layout.voxelise.elements;

        this._ui.getActionOutput(EAction.Voxelise)
            .setTaskInProgress('action', '[Voxel Mesh]: Loading...');

        const payload: TToWorkerMessage = {
            action: 'Voxelise',
            params: {
                constraintAxis: uiElements.constraintAxis.getCachedValue(),
                voxeliser: uiElements.voxeliser.getCachedValue(),
                size: uiElements.size.getCachedValue(),
                useMultisampleColouring: uiElements.multisampleColouring.getCachedValue(),
                textureFiltering: uiElements.textureFiltering.getCachedValue() === 'linear' ? TextureFiltering.Linear : TextureFiltering.Nearest,
                enableAmbientOcclusion: uiElements.ambientOcclusion.getCachedValue(),
                voxelOverlapRule: uiElements.voxelOverlapRule.getCachedValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            ASSERT(payload.action === 'Voxelise');
            const outputElement = this._ui.getActionOutput(EAction.Voxelise);

            outputElement.setTaskInProgress('render', '[Renderer]: Processing...');
            this._workerController.addJob(this._renderVoxelMesh());
        };

        return { id: 'Voxelise', payload: payload, callback: callback };
    }

    private _renderVoxelMesh(): TWorkerJob {
        const uiElements = this._ui.layout.voxelise.elements;

        const payload: TToWorkerMessage = {
            action: 'RenderNextVoxelMeshChunk',
            params: {
                desiredHeight: uiElements.size.getCachedValue(),
                enableAmbientOcclusion: uiElements.ambientOcclusion.getCachedValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is not managed through `AppContext::do`, therefore
            // we need to check the payload is not an error

            switch (payload.action) {
                case 'KnownError':
                case 'UnknownError': {
                    this._ui.getActionOutput(EAction.Voxelise).setTaskComplete(
                        'render',
                        '[Renderer]: Failed',
                        [payload.action === 'KnownError' ? payload.error.message : 'Something unexpectedly went wrong'],
                        'error',
                    );
                    LOG_ERROR(payload.error);

                    this._ui.enableTo(EAction.Assign);
                    break;
                }
                default: {
                    ASSERT(payload.action === 'RenderNextVoxelMeshChunk');
                    Renderer.Get.useVoxelMeshChunk(payload.result);

                    if (payload.result.moreVoxelsToBuffer) {
                        this._workerController.addJob(this._renderVoxelMesh());
                    } else {
                        this._ui.getActionOutput(EAction.Voxelise).setTaskComplete(
                            'render',
                            '[Renderer]: Succeeded',
                            [],
                            'success',
                        );
                        this._ui.enableTo(EAction.Assign);
                    }
                }
            }
        };

        return { id: 'RenderNextVoxelMeshChunk', payload: payload, callback: callback };
    }

    private _assign(): TWorkerJob {
        const uiElements = this._ui.layout.assign.elements;

        this._ui.getActionOutput(EAction.Assign)
            .setTaskInProgress('action', '[Block Mesh]: Loading...');

        Renderer.Get.setLightingAvailable(uiElements.calculateLighting.getCachedValue());

        const payload: TToWorkerMessage = {
            action: 'Assign',
            params: {
                textureAtlas: uiElements.textureAtlas.getCachedValue(),
                blockPalette: uiElements.blockPalette.getCachedValue(),
                dithering: uiElements.dithering.getCachedValue(),
                colourSpace: ColourSpace.RGB,
                fallable: uiElements.fallable.getCachedValue() as FallableBehaviour,
                resolution: Math.pow(2, uiElements.colourAccuracy.getCachedValue()),
                calculateLighting: uiElements.calculateLighting.getCachedValue(),
                lightThreshold: uiElements.lightThreshold.getCachedValue(),
                contextualAveraging: uiElements.contextualAveraging.getCachedValue(),
                errorWeight: uiElements.errorWeight.getCachedValue() / 10,
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            ASSERT(payload.action === 'Assign');

            const outputElement = this._ui.getActionOutput(EAction.Assign);

            outputElement.setTaskInProgress('render', '[Renderer]: Processing...');
            this._workerController.addJob(this._renderBlockMesh());
        };

        return { id: 'Assign', payload: payload, callback: callback };
    }

    private _renderBlockMesh(): TWorkerJob {
        const uiElements = this._ui.layout.assign.elements;

        const payload: TToWorkerMessage = {
            action: 'RenderNextBlockMeshChunk',
            params: {
                textureAtlas: uiElements.textureAtlas.getCachedValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is not managed through `AppContext::do`, therefore
            // we need to check the payload is not an error

            switch (payload.action) {
                case 'KnownError':
                case 'UnknownError': {
                    this._ui.getActionOutput(EAction.Assign).setTaskComplete(
                        'render',
                        '[Renderer]: Failed',
                        [payload.action === 'KnownError' ? payload.error.message : 'Something unexpectedly went wrong'],
                        'error',
                    );
                    LOG_ERROR(payload.error);

                    this._ui.enableTo(EAction.Export);
                    break;
                }
                default: {
                    ASSERT(payload.action === 'RenderNextBlockMeshChunk');
                    Renderer.Get.useBlockMeshChunk(payload.result);

                    if (payload.result.moreBlocksToBuffer) {
                        this._workerController.addJob(this._renderBlockMesh());
                    } else {
                        this._ui.getActionOutput(EAction.Assign).setTaskComplete(
                            'render',
                            '[Renderer]: Succeeded',
                            [],
                            'success',
                        );
                        this._ui.enableTo(EAction.Export);
                    }
                }
            }
        };

        return { id: 'RenderNextBlockMeshChunk', payload: payload, callback: callback };
    }

    private _export(): (TWorkerJob | undefined) {
        const exporterID: TExporters = this._ui.layout.export.elements.export.getCachedValue();
        const exporter: IExporter = ExporterFactory.GetExporter(exporterID);

        const filepath = remote.dialog.showSaveDialogSync({
            title: 'Save structure',
            buttonLabel: 'Save',
            filters: [exporter.getFormatFilter()],
        });

        if (filepath === undefined) {
            return undefined;
        }

        this._ui.getActionOutput(EAction.Export)
            .setTaskInProgress('action', '[Exporter]: Saving...');

        const payload: TToWorkerMessage = {
            action: 'Export',
            params: {
                filepath: filepath,
                exporter: exporterID,
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            this._ui.enableTo(EAction.Export);
        };

        return { id: 'Export', payload: payload, callback: callback };
    }

    public draw() {
        Renderer.Get.update();
        this._ui.tick(this._workerController.isBusy());
        Renderer.Get.draw();
    }
}
