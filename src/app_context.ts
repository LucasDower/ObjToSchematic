import '../styles.css';

import { FallableBehaviour } from './block_mesh';
import { ArcballCamera } from './camera';
import { AppConfig } from './config';
import { EAppEvent, EventManager } from './event';
import { TExporters } from './exporters/exporters';
import { MaterialMapManager } from './material-map';
import { MaterialType } from './mesh';
import { MeshType, Renderer } from './renderer';
import { AppConsole, TMessage } from './ui/console';
import { SolidMaterialElement } from './ui/elements/solid_material_element';
import { TexturedMaterialElement } from './ui/elements/textured_material_element';
import { UI } from './ui/layout';
import { ColourSpace, EAction } from './util';
import { ASSERT } from './util/error_util';
import { download } from './util/file_util';
import { Logger } from './util/log_util';
import { Vector3 } from './vector';
import { TWorkerJob, WorkerController } from './worker_controller';
import { TFromWorkerMessage, TToWorkerMessage } from './worker_types';

export class AppContext {
    private _ui: UI;
    private _workerController: WorkerController;
    private _lastAction?: EAction;
    public maxConstraint?: Vector3;
    private _materialManager: MaterialMapManager;

    public constructor() {
        this._materialManager = new MaterialMapManager(new Map());

        Logger.Get.enableLOG();
        Logger.Get.enableLOGMAJOR();
        Logger.Get.enableLOGWARN();

        AppConfig.Get.dumpConfig();

        // TODO Unimplemented
        //FileUtil.rmdirIfExist(AppPaths.Get.gen);

        const gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl');
        if (!gl) {
            throw Error('Could not load WebGL context');
        }

        this._ui = new UI(this);
        this._ui.build();
        this._ui.registerEvents();
        this._ui.disable(EAction.Materials);

        this._workerController = new WorkerController();
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

        AppConsole.info('Ready');
    }

    public async do(action: EAction) {
        this._ui.cacheValues(action);
        this._ui.disable(action);
        this._ui.disableAll();

        const workerJob = await this._getWorkerJob(action);
        if (workerJob === undefined) {
            this._ui.enableTo(action);
            return;
        }

        const jobCallback = (payload: TFromWorkerMessage) => {
            switch (payload.action) {
                case 'KnownError':
                case 'UnknownError': {
                    AppConsole.error(payload.action === 'KnownError' ? payload.error.message : 'Something unexpectedly went wrong');
                    this._ui.getActionButton(action)
                        .stopLoading()
                        .setProgress(0.0);

                    this._ui.enableTo(action);
                    break;
                }
                default: {
                    ASSERT(payload.action !== 'Progress');
                    this._addWorkerMessagesToConsole(payload.messages);

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

    private _addWorkerMessagesToConsole(messages: TMessage[]) {
        messages.forEach((message) => {
            AppConsole.add(message);
        });
    }

    private _getWorkerJob(action: EAction): (Promise<TWorkerJob | undefined>) {
        switch (action) {
            case EAction.Import:
                return this._import();
            case EAction.Materials:
                return Promise.resolve(this._materials());
            case EAction.Voxelise:
                return Promise.resolve(this._voxelise());
            case EAction.Assign:
                return Promise.resolve(this._assign());
            case EAction.Export:
                return Promise.resolve(this._export());
        }
        ASSERT(false);
    }

    private async _import(): Promise<TWorkerJob> {
        const uiElements = this._ui.layout.import.elements;
        AppConsole.info('Importing mesh...');

        const payload: TToWorkerMessage = {
            action: 'Import',
            params: {
                importer: 'obj',
                fileSource: await uiElements.input.getValue(),
                rotation: uiElements.rotation.getValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            ASSERT(payload.action === 'Import');
            AppConsole.success('Imported mesh');

            const dimensions = new Vector3(
                payload.result.dimensions.x,
                payload.result.dimensions.y,
                payload.result.dimensions.z,
            );
            dimensions.mulScalar(AppConfig.Get.CONSTRAINT_MAXIMUM_HEIGHT / 8.0).floor();
            this.maxConstraint = dimensions;
            this._materialManager = new MaterialMapManager(payload.result.materials);

            if (payload.result.triangleCount < AppConfig.Get.RENDER_TRIANGLE_THRESHOLD) {
                this._workerController.addJob(this._renderMesh());
            } else {
                AppConsole.warning(`Will not render mesh as its over ${AppConfig.Get.RENDER_TRIANGLE_THRESHOLD.toLocaleString()} triangles.`);
            }

            this._updateMaterialsAction();
        };
        callback.bind(this);

        return { id: 'Import', payload: payload, callback: callback };
    }

    private _materials(): TWorkerJob {
        AppConsole.info('Updating materials...');

        const payload: TToWorkerMessage = {
            action: 'SetMaterials',
            params: {
                materials: this._materialManager.materials,
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            ASSERT(payload.action === 'SetMaterials');
            AppConsole.success('Updated materials');

            // The material map shouldn't need updating because the materials
            // returned from the worker **should** be the same as the materials
            // sent.
            {
                //this._materialMap = payload.result.materials;
                //this._onMaterialMapChanged();
            }

            payload.result.materialsChanged.forEach((materialName) => {
                const material = this._materialManager.materials.get(materialName);
                ASSERT(material !== undefined);
                Renderer.Get.recreateMaterialBuffer(materialName, material);
                Renderer.Get.setModelToUse(MeshType.TriangleMesh);
            });

            this._ui.enableTo(EAction.Voxelise);
        };

        return { id: 'Import', payload: payload, callback: callback };
    }

    private _updateMaterialsAction() {
        this._ui.layoutDull['materials'].elements = {};
        this._ui.layoutDull['materials'].elementsOrder = [];

        this._materialManager.materials.forEach((material, materialName) => {
            if (material.type === MaterialType.solid) {
                this._ui.layoutDull['materials'].elements[`mat_${materialName}`] = new SolidMaterialElement(materialName, material)
                    .setLabel(materialName)
                    .onChangeTypeDelegate(() => {
                        this._materialManager.changeMaterialType(materialName, MaterialType.textured);
                        this._updateMaterialsAction();
                    });
            } else {
                this._ui.layoutDull['materials'].elements[`mat_${materialName}`] = new TexturedMaterialElement(materialName, material)
                    .setLabel(materialName)
                    .onChangeTypeDelegate(() => {
                        this._materialManager.changeMaterialType(materialName, MaterialType.solid);
                        this._updateMaterialsAction();
                    })
                    .onChangeTransparencyTypeDelegate((newTransparency) => {
                        this._materialManager.changeTransparencyType(materialName, newTransparency);
                        this._updateMaterialsAction();
                    });
            }

            this._ui.layoutDull['materials'].elementsOrder.push(`mat_${materialName}`);
        });
        this._ui.refreshSubcomponents(this._ui.layoutDull['materials']);
    }

    private _renderMesh(): TWorkerJob {
        AppConsole.info('Rendering mesh...');

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
                    AppConsole.error(payload.action === 'KnownError' ? payload.error.message : 'Could not render mesh');
                    break;
                }
                default: {
                    ASSERT(payload.action === 'RenderMesh');
                    this._addWorkerMessagesToConsole(payload.messages);
                    AppConsole.success('Rendered mesh');

                    Renderer.Get.useMesh(payload.result);
                }
            }
        };

        return { id: 'RenderMesh', payload: payload, callback: callback };
    }

    private _voxelise(): TWorkerJob {
        AppConsole.info('Loading voxel mesh...');

        const uiElements = this._ui.layout.voxelise.elements;

        const payload: TToWorkerMessage = {
            action: 'Voxelise',
            params: {
                constraintAxis: uiElements.constraintAxis.getValue(),
                voxeliser: uiElements.voxeliser.getValue(),
                size: uiElements.size.getValue(),
                useMultisampleColouring: uiElements.multisampleColouring.getValue(),
                enableAmbientOcclusion: uiElements.ambientOcclusion.getValue(),
                voxelOverlapRule: uiElements.voxelOverlapRule.getValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            ASSERT(payload.action === 'Voxelise');
            AppConsole.success('Loaded voxel mesh');

            this._workerController.addJob(this._renderVoxelMesh(true));
        };

        return { id: 'Voxelise', payload: payload, callback: callback };
    }

    private _renderVoxelMesh(firstChunk: boolean): TWorkerJob {
        if (firstChunk) {
            AppConsole.info('Rendering voxel mesh...');
        }

        const uiElements = this._ui.layout.voxelise.elements;

        const payload: TToWorkerMessage = {
            action: 'RenderNextVoxelMeshChunk',
            params: {
                enableAmbientOcclusion: uiElements.ambientOcclusion.getValue(),
                desiredHeight: uiElements.size.getValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is not managed through `AppContext::do`, therefore
            // we need to check the payload is not an error

            switch (payload.action) {
                case 'KnownError':
                case 'UnknownError': {
                    AppConsole.error(payload.action === 'KnownError' ? payload.error.message : 'Could not render voxel mesh');
                    this._ui.enableTo(EAction.Assign);
                    break;
                }
                default: {
                    ASSERT(payload.action === 'RenderNextVoxelMeshChunk');
                    this._addWorkerMessagesToConsole(payload.messages);

                    Renderer.Get.useVoxelMeshChunk(payload.result);

                    if (payload.result.moreVoxelsToBuffer) {
                        this._workerController.addJob(this._renderVoxelMesh(false));
                    } else {
                        AppConsole.success('Rendered voxel mesh');
                        this._ui.enableTo(EAction.Assign);
                    }
                }
            }
        };

        return { id: 'RenderNextVoxelMeshChunk', payload: payload, callback: callback };
    }

    private _assign(): (TWorkerJob | undefined) {
        const uiElements = this._ui.layout.assign.elements;

        if (uiElements.blockPalette.getValue().count() <= 0) {
            AppConsole.error('No blocks selected');
            return;
        }
        AppConsole.info('Loading block mesh...');

        Renderer.Get.setLightingAvailable(uiElements.calculateLighting.getValue());

        const payload: TToWorkerMessage = {
            action: 'Assign',
            params: {
                textureAtlas: uiElements.textureAtlas.getValue(),
                blockPalette: uiElements.blockPalette.getValue().getBlocks(),
                dithering: uiElements.dithering.getValue(),
                colourSpace: ColourSpace.RGB,
                fallable: uiElements.fallable.getValue() as FallableBehaviour,
                resolution: Math.pow(2, uiElements.colourAccuracy.getValue()),
                calculateLighting: uiElements.calculateLighting.getValue(),
                lightThreshold: uiElements.lightThreshold.getValue(),
                contextualAveraging: uiElements.contextualAveraging.getValue(),
                errorWeight: uiElements.errorWeight.getValue() / 10,
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            ASSERT(payload.action === 'Assign');
            AppConsole.success('Loaded block mesh');

            this._workerController.addJob(this._renderBlockMesh(true));
        };

        return { id: 'Assign', payload: payload, callback: callback };
    }

    private _renderBlockMesh(firstChunk: boolean): TWorkerJob {
        if (firstChunk) {
            AppConsole.info('Rendering block mesh...');
        }

        const uiElements = this._ui.layout.assign.elements;

        const payload: TToWorkerMessage = {
            action: 'RenderNextBlockMeshChunk',
            params: {
                textureAtlas: uiElements.textureAtlas.getValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is not managed through `AppContext::do`, therefore
            // we need to check the payload is not an error

            switch (payload.action) {
                case 'KnownError':
                case 'UnknownError': {
                    AppConsole.error(payload.action === 'KnownError' ? payload.error.message : 'Could not draw block mesh');
                    this._ui.enableTo(EAction.Export);
                    break;
                }
                default: {
                    ASSERT(payload.action === 'RenderNextBlockMeshChunk');
                    this._addWorkerMessagesToConsole(payload.messages);

                    Renderer.Get.useBlockMeshChunk(payload.result);

                    if (payload.result.moreBlocksToBuffer) {
                        this._workerController.addJob(this._renderBlockMesh(false));
                    } else {
                        AppConsole.success('Rendered block mesh');
                        this._ui.enableTo(EAction.Export);
                    }
                }
            }
        };

        return { id: 'RenderNextBlockMeshChunk', payload: payload, callback: callback };
    }

    private _export(): (TWorkerJob | undefined) {
        AppConsole.info('Exporting structure...');

        const exporterID: TExporters = this._ui.layout.export.elements.export.getValue();
        const filepath = '';

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
            ASSERT(payload.action === 'Export');
            AppConsole.success('Exported structure');

            download(payload.result.buffer, 'result.' + payload.result.extension);

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
