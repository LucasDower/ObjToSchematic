import '../styles.css';

import { FallableBehaviour } from './block_mesh';
import { ArcballCamera } from './camera';
import { AppConfig } from './config';
import { EAppEvent, EventManager } from './event';
import { MaterialMapManager } from './material-map';
import { MeshType, Renderer } from './renderer';
import { AppConsole, TMessage } from './ui/console';
import { UI } from './ui/layout';
import { ColourSpace, EAction } from './util';
import { ASSERT } from './util/error_util';
import { download } from './util/file_util';
import { LOG_ERROR, Logger } from './util/log_util';
import { Vector3 } from './vector';
import { WorkerController } from './worker_controller';
import { TFromWorkerMessage } from './worker_types';

export class AppContext {
    private _workerController: WorkerController;
    private _lastAction?: EAction;
    public maxConstraint?: Vector3;
    private _materialManager: MaterialMapManager;

    public constructor() {
        AppConsole.info('Initialising...');
        this._materialManager = new MaterialMapManager(new Map());

        Logger.Get.enableLOG();
        Logger.Get.enableLOGMAJOR();
        Logger.Get.enableLOGWARN();

        AppConfig.Get.dumpConfig();
        EventManager.Get.bindToContext(this);

        const gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl');
        if (!gl) {
            throw Error('Could not load WebGL context');
        }
        
        UI.Get.bindToContext(this);
        UI.Get.build();
        UI.Get.registerEvents();
        UI.Get.updateMaterialsAction(this._materialManager);
        UI.Get.disableAll();

        this._workerController = new WorkerController();
        this._workerController.execute({ action: 'Init', params: {}}).then(() => {
            UI.Get.enable(EAction.Import);
            AppConsole.success('Ready');
        });

        ArcballCamera.Get.toggleAngleSnap();
    }

    public getLastAction() {
        return this._lastAction;
    }

    private async _import(): Promise<boolean> {
        // Gather data from the UI to send to the worker
        const components = UI.Get.layout.import.components;

        AppConsole.info('Importing mesh...');
        {
            // Instruct the worker to perform the job and await the result
            const resultImport = await this._workerController.execute({
                action: 'Import',
                params: {
                    file: components.input.getValue(),
                    rotation: components.rotation.getValue(),
                },
            });

            UI.Get.getActionButton(EAction.Import).resetLoading();
            if (this._handleErrors(resultImport)) {
                return false;
            }
            ASSERT(resultImport.action === 'Import');

            AppConsole.success('Imported mesh');
            this._addWorkerMessagesToConsole(resultImport.messages);
            
            this.maxConstraint = Vector3.copy(resultImport.result.dimensions)
                .mulScalar(AppConfig.Get.CONSTRAINT_MAXIMUM_HEIGHT / 8.0).floor();
            this._materialManager = new MaterialMapManager(resultImport.result.materials);
            UI.Get.updateMaterialsAction(this._materialManager);
        }

        AppConsole.info('Rendering mesh...');
        {
            // Instruct the worker to perform the job and await the result
            const resultRender = await this._workerController.execute({
                action: 'RenderMesh',
                params: {},
            });

            UI.Get.getActionButton(EAction.Import).resetLoading();
            if (this._handleErrors(resultRender)) {
                return false;
            }
            ASSERT(resultRender.action === 'RenderMesh');
            
            this._addWorkerMessagesToConsole(resultRender.messages);
            Renderer.Get.useMesh(resultRender.result);
        }
        AppConsole.success('Rendered mesh');

        return true;
    }

    
    private async _materials(): Promise<boolean> {
        AppConsole.info('Updating materials...');
        {
            // Instruct the worker to perform the job and await the result
            const resultMaterials = await this._workerController.execute({
                action: 'SetMaterials',
                params: {
                    materials: this._materialManager.materials,
                },
            });

            UI.Get.getActionButton(EAction.Materials).resetLoading();
            if (this._handleErrors(resultMaterials)) {
                return false;
            }
            ASSERT(resultMaterials.action === 'SetMaterials');

            resultMaterials.result.materialsChanged.forEach((materialName) => {
                const material = this._materialManager.materials.get(materialName);
                ASSERT(material !== undefined);
                Renderer.Get.recreateMaterialBuffer(materialName, material);
                Renderer.Get.setModelToUse(MeshType.TriangleMesh);
            });
            
            this._addWorkerMessagesToConsole(resultMaterials.messages);
        }
        AppConsole.success('Updated materials');

        return true;
    }

    private async _voxelise(): Promise<boolean> {
        // Gather data from the UI to send to the worker
        const components = UI.Get.layout.voxelise.components;

        AppConsole.info('Loading voxel mesh...');
        {
            // Instruct the worker to perform the job and await the result
            const resultVoxelise = await this._workerController.execute({
                action: 'Voxelise',
                params: {
                    constraintAxis: components.constraintAxis.getValue(),
                    voxeliser: components.voxeliser.getValue(),
                    size: components.size.getValue(),
                    useMultisampleColouring: components.multisampleColouring.getValue(),
                    enableAmbientOcclusion: components.ambientOcclusion.getValue(),
                    voxelOverlapRule: components.voxelOverlapRule.getValue(),
                },
            });

            UI.Get.getActionButton(EAction.Voxelise).resetLoading();
            if (this._handleErrors(resultVoxelise)) {
                return false;
            }
            ASSERT(resultVoxelise.action === 'Voxelise');
            
            this._addWorkerMessagesToConsole(resultVoxelise.messages);
        }
        AppConsole.success('Loaded voxel mesh');

        AppConsole.info('Rendering voxel mesh...');
        {
            let moreVoxelsToBuffer = false;
            do {
                // Instruct the worker to perform the job and await the result
                const resultRender = await this._workerController.execute({
                    action: 'RenderNextVoxelMeshChunk',
                    params: {
                        enableAmbientOcclusion: components.ambientOcclusion.getValue(),
                        desiredHeight: components.size.getValue(),
                    },
                });

                UI.Get.getActionButton(EAction.Voxelise).resetLoading();
                if (this._handleErrors(resultRender)) {
                    return false;
                }
                ASSERT(resultRender.action === 'RenderNextVoxelMeshChunk');

                moreVoxelsToBuffer = resultRender.result.moreVoxelsToBuffer;
                this._addWorkerMessagesToConsole(resultRender.messages);

                Renderer.Get.useVoxelMeshChunk(resultRender.result);
            } while (moreVoxelsToBuffer);
        }
        AppConsole.success('Rendered voxel mesh');

        return true;
    }

    private async _assign(): Promise<boolean> {
        // Gather data from the UI to send to the worker
        const components = UI.Get.layout.assign.components;

        AppConsole.info('Loading block mesh...');
        {
            // Instruct the worker to perform the job and await the result
            const resultAssign = await this._workerController.execute({
                action: 'Assign',
                params: {
                    textureAtlas: components.textureAtlas.getValue(),
                    blockPalette: components.blockPalette.getValue().getBlocks(),
                    dithering: components.dithering.getValue(),
                    colourSpace: ColourSpace.RGB,
                    fallable: components.fallable.getValue() as FallableBehaviour,
                    resolution: Math.pow(2, components.colourAccuracy.getValue()),
                    calculateLighting: components.calculateLighting.getValue(),
                    lightThreshold: components.lightThreshold.getValue(),
                    contextualAveraging: components.contextualAveraging.getValue(),
                    errorWeight: components.errorWeight.getValue() / 10,
                },
            });

            UI.Get.getActionButton(EAction.Assign).resetLoading();
            if (this._handleErrors(resultAssign)) {
                return false;
            }
            ASSERT(resultAssign.action === 'Assign');
            
            this._addWorkerMessagesToConsole(resultAssign.messages);
        }
        AppConsole.success('Loaded block mesh');

        AppConsole.info('Rendering block mesh...');
        {
            let moreBlocksToBuffer = false;
            do {
                // Instruct the worker to perform the job and await the result
                const resultRender = await this._workerController.execute({
                    action: 'RenderNextBlockMeshChunk',
                    params: {
                        textureAtlas: components.textureAtlas.getValue(),
                    },
                });

                UI.Get.getActionButton(EAction.Assign).resetLoading();
                if (this._handleErrors(resultRender)) {
                    return false;
                }
                ASSERT(resultRender.action === 'RenderNextBlockMeshChunk');

                moreBlocksToBuffer = resultRender.result.moreBlocksToBuffer;
                this._addWorkerMessagesToConsole(resultRender.messages);

                Renderer.Get.useBlockMeshChunk(resultRender.result);
            } while (moreBlocksToBuffer);
        }
        AppConsole.success('Rendered voxel mesh');

        return true;
    }

    private async _export(): Promise<boolean> {
        // Gather data from the UI to send to the worker
        const components = UI.Get.layout.export.components;

        AppConsole.info('Exporting structure...');
        {
            // Instruct the worker to perform the job and await the result
            const resultExport = await this._workerController.execute({
                action: 'Export',
                params: {
                    filepath: '',
                    exporter: components.export.getValue(),
                },
            });

            UI.Get.getActionButton(EAction.Export).resetLoading();
            if (this._handleErrors(resultExport)) {
                return false;
            }
            ASSERT(resultExport.action === 'Export');
            
            this._addWorkerMessagesToConsole(resultExport.messages);
            download(resultExport.result.buffer, 'result.' + resultExport.result.extension);
        }
        AppConsole.success('Exported structure');

        return true;
    }

    /**
     * Check if the result from the worker is an error message
     * if so, handle it and return true, otherwise false.
     */
    private _handleErrors(result: TFromWorkerMessage) {
        if (result.action === 'KnownError') {
            AppConsole.error(result.error.message);
            return true;
        } else if (result.action === 'UnknownError') {
            AppConsole.error('Something unexpectedly went wrong');
            LOG_ERROR(result.error);
            return true;
        }
        return false;
    }

    public async do(action: EAction) {
        // Disable the UI while the worker is working
        UI.Get.disableAll();

        this._lastAction = action;
        
        const success = await this._executeAction(action);
        if (success) {
            UI.Get.enableTo(action + 1);
        } else {
            UI.Get.enableTo(action);
        }
    }

    private _addWorkerMessagesToConsole(messages: TMessage[]) {
        messages.forEach((message) => {
            AppConsole.add(message);
        });
    }

    private async _executeAction(action: EAction): Promise<boolean> {
        switch (action) {
            case EAction.Import:
                return await this._import();
            case EAction.Materials:
                return await this._materials();
            case EAction.Voxelise:
                return await this._voxelise();
            case EAction.Assign:
                return await this._assign();
            case EAction.Export:
                return await this._export();
        }
        ASSERT(false);
    }

    public draw() {
        Renderer.Get.update();
        UI.Get.tick(this._workerController.isBusy());
        Renderer.Get.draw();
    }
}
