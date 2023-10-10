import ATLAS_VANILLA from '../res/atlases/vanilla.atlas';

import { AppAnalytics } from './analytics';
import { FallableBehaviour } from '../../Core/src/block_mesh';
import { ArcballCamera } from './renderer/camera';
import { AppConfig } from './config';
import { EAppEvent, EventManager } from './event';
import { LOC, Localiser, TLocalisedString } from './localiser';
import { MouseManager } from './mouse';
import { MeshType, Renderer } from './renderer/renderer';
import { AppConsole, TMessage } from './ui/console';
import { UI } from './ui/layout';
import { EAction } from '../../Core/src/util';
import { ASSERT } from '../../Core/src/util/error_util';
import { download, downloadAsZip } from './util/file_util';
import { LOG_ERROR, Logger } from '../../Core/src/util/log_util';
import { Vector3 } from '../../Core/src/vector';
import { WorkerController } from './worker/worker_controller';
import { TFromWorkerMessage } from './worker/worker_types';

export class AppContext {
    /* Singleton */
    private static _instance: AppContext;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _workerController: WorkerController;
    private _lastAction?: EAction;
    public minConstraint?: { x: number, z: number };
    public maxConstraint?: { x: number, z: number };
    private _loadedFilename: string | null;

    private constructor() {
        this._workerController = new WorkerController();
        this._loadedFilename = null;
    }

    public static async init() {
        AppAnalytics.Init();

        await Localiser.Get.init();
        AppConsole.info(LOC('init.initialising'));

        Logger.Get.enableLOG();
        Logger.Get.enableLOGMAJOR();
        Logger.Get.enableLOGWARN();

        AppConfig.Get.dumpConfig();

        EventManager.Get.bindToContext(this.Get);

        UI.Get.bindToContext(this.Get);
        UI.Get.build();
        UI.Get.registerEvents();
        UI.Get.updateMaterialsAction([]);
        UI.Get.disableAll();

        ArcballCamera.Get.init();
        MouseManager.Get.init();

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        this.Get._workerController.execute({ action: 'Init', params: {}}).then(() => {
            UI.Get.enableTo(EAction.Import);
            AppConsole.success(LOC('init.ready'));
        });

        ArcballCamera.Get.toggleAngleSnap();

        EventManager.Get.add(EAppEvent.onLanguageChanged, () => {
            this.Get._workerController.execute({ action: 'Settings', params: { language: Localiser.Get.getCurrentLanguage() }}).then(() => {
            });
        });

        Renderer.Get.init();
    }

    public getLastAction() {
        return this._lastAction;
    }

    private async _import(): Promise<boolean> {
        // Gather data from the UI to send to the worker
        const components = UI.Get.layout.import.components;
        let filetype: string;

        AppConsole.info(LOC('import.importing_mesh'));
        {
            // Instruct the worker to perform the job and await the result
            const file = components.input.getValue();
            filetype = file.type;

            const resultImport = await this._workerController.execute({
                action: 'Import',
                params: {
                    file: file,
                    rotation: components.rotation.getValue(),
                },
            });

            UI.Get.getActionButton(EAction.Import)?.resetLoading();
            if (this._handleErrors(resultImport)) {
                return false;
            }
            ASSERT(resultImport.action === 'Import');

            AppConsole.success(LOC('import.imported_mesh'));
            this._addWorkerMessagesToConsole(resultImport.messages);

            UI.Get._ui.voxelise.components.constraintAxis.setValue('y');
            UI.Get._ui.voxelise.components.size.setValue(80);

            this.minConstraint = Vector3.copy(resultImport.result.dimensions)
                .mulScalar(AppConfig.Get.CONSTRAINT_MINIMUM_HEIGHT).ceil();
            this.maxConstraint = Vector3.copy(resultImport.result.dimensions)
                .mulScalar(AppConfig.Get.CONSTRAINT_MAXIMUM_HEIGHT).floor();

            UI.Get._ui.voxelise.components.constraintAxis.setOptionEnabled(0, this.minConstraint.x > 0 && this.minConstraint.x <= this.maxConstraint.x);
            UI.Get._ui.voxelise.components.constraintAxis.setOptionEnabled(2, this.minConstraint.z > 0 && this.minConstraint.z <= this.maxConstraint.z);

            UI.Get.updateMaterialsAction(resultImport.result.materials);

            this._loadedFilename = file.name.split('.')[0] ?? 'result';
        }

        AppConsole.info(LOC('import.rendering_mesh'));
        {
            // Instruct the worker to perform the job and await the result
            const resultRender = await this._workerController.execute({
                action: 'RenderMesh',
                params: {},
            });

            UI.Get.getActionButton(EAction.Import)?.resetLoading();
            if (this._handleErrors(resultRender)) {
                return false;
            }
            ASSERT(resultRender.action === 'RenderMesh');

            this._addWorkerMessagesToConsole(resultRender.messages);
            Renderer.Get.useMesh(resultRender.result);
        }
        AppConsole.success(LOC('import.rendered_mesh'));

        AppAnalytics.Event('import', {
            'filetype': filetype,
        });
        return true;
    }


    private async _materials(): Promise<boolean> {
        // Gather data from the UI to send to the worker
        const materials = await UI.Get.getMaterials();        

        AppConsole.info(LOC('materials.updating_materials'));
        {
            // Instruct the worker to perform the job and await the result
            const resultMaterials = await this._workerController.execute({
                action: 'SetMaterials',
                params: {
                    materials: materials,
                },
            });

            UI.Get.getActionButton(EAction.Materials)?.resetLoading();
            if (this._handleErrors(resultMaterials)) {
                return false;
            }
            ASSERT(resultMaterials.action === 'SetMaterials');

            materials.forEach((material) => {
                Renderer.Get.recreateMaterialBuffer(material);
                Renderer.Get.setModelToUse(MeshType.TriangleMesh);
            });

            this._addWorkerMessagesToConsole(resultMaterials.messages);
        }
        AppConsole.success(LOC('materials.updated_materials'));

        AppAnalytics.Event('materials')
        return true;
    }

    private async _voxelise(): Promise<boolean> {
        // Gather data from the UI to send to the worker
        const components = UI.Get.layout.voxelise.components;

        AppConsole.info(LOC('voxelise.loading_voxel_mesh'));
        {
            // Instruct the worker to perform the job and await the result
            const resultVoxelise = await this._workerController.execute({
                action: 'Voxelise',
                params: {
                    constraintAxis: components.constraintAxis.getValue(),
                    size: components.size.getValue(),
                    useMultisampleColouring: components.multisampleColouring.getValue(),
                    enableAmbientOcclusion: components.ambientOcclusion.getValue(),
                    voxelOverlapRule: components.voxelOverlapRule.getValue(),
                },
            });

            UI.Get.getActionButton(EAction.Voxelise)?.resetLoading();
            if (this._handleErrors(resultVoxelise)) {
                return false;
            }
            ASSERT(resultVoxelise.action === 'Voxelise');

            this._addWorkerMessagesToConsole(resultVoxelise.messages);
        }
        AppConsole.success(LOC('voxelise.loaded_voxel_mesh'));

        AppConsole.info(LOC('voxelise.rendering_voxel_mesh'));
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

                UI.Get.getActionButton(EAction.Voxelise)?.resetLoading();
                if (this._handleErrors(resultRender)) {
                    return false;
                }
                ASSERT(resultRender.action === 'RenderNextVoxelMeshChunk');

                moreVoxelsToBuffer = resultRender.result.moreVoxelsToBuffer;
                this._addWorkerMessagesToConsole(resultRender.messages);

                Renderer.Get.useVoxelMeshChunk(resultRender.result);
            } while (moreVoxelsToBuffer);
        }
        AppConsole.success(LOC('voxelise.rendered_voxel_mesh'));

        AppAnalytics.Event('voxelise', {
            constraintAxis: components.constraintAxis.getValue(),
            size: components.size.getValue(),
            useMultisampleColouring: components.multisampleColouring.getValue(),
            enableAmbientOcclusion: components.ambientOcclusion.getValue(),
            voxelOverlapRule: components.voxelOverlapRule.getValue(),
        });
        return true;
    }

    private async _assign(): Promise<boolean> {
        // Gather data from the UI to send to the worker
        const components = UI.Get.layout.assign.components;

        AppConsole.info(LOC('assign.loading_block_mesh'));
        {
            // Instruct the worker to perform the job and await the result
            const resultAssign = await this._workerController.execute({
                action: 'Assign',
                params: {
                    blockPalette: components.blockPalette.getValue(),
                    dithering: components.dithering.getValue(),
                    ditheringMagnitude: components.ditheringMagnitude.getValue(),
                    fallable: components.fallable.getValue() as FallableBehaviour,
                    resolution: Math.pow(2, components.colourAccuracy.getValue()),
                    calculateLighting: components.calculateLighting.getValue(),
                    lightThreshold: components.lightThreshold.getValue(),
                    contextualAveraging: components.contextualAveraging.getValue(),
                    errorWeight: components.errorWeight.getValue() / 10,
                    atlasJSON: JSON.parse(ATLAS_VANILLA),
                },
            });

            UI.Get.getActionButton(EAction.Assign)?.resetLoading();
            if (this._handleErrors(resultAssign)) {
                return false;
            }
            ASSERT(resultAssign.action === 'Assign');

            this._addWorkerMessagesToConsole(resultAssign.messages);
        }
        AppConsole.success(LOC('assign.loaded_block_mesh'));

        Renderer.Get.setLightingAvailable(components.calculateLighting.getValue());

        AppConsole.info(LOC('assign.rendering_block_mesh'));
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

                UI.Get.getActionButton(EAction.Assign)?.resetLoading();
                if (this._handleErrors(resultRender)) {
                    return false;
                }
                ASSERT(resultRender.action === 'RenderNextBlockMeshChunk');

                moreBlocksToBuffer = resultRender.result.moreBlocksToBuffer;
                this._addWorkerMessagesToConsole(resultRender.messages);

                Renderer.Get.useBlockMeshChunk(resultRender.result);
            } while (moreBlocksToBuffer);
        }
        AppConsole.success(LOC('assign.rendered_block_mesh'));

        AppAnalytics.Event('assign', {
            dithering: components.dithering.getValue(),
            ditheringMagnitude: components.ditheringMagnitude.getValue(),
            fallable: components.fallable.getValue() as FallableBehaviour,
            resolution: Math.pow(2, components.colourAccuracy.getValue()),
            calculateLighting: components.calculateLighting.getValue(),
            lightThreshold: components.lightThreshold.getValue(),
            contextualAveraging: components.contextualAveraging.getValue(),
            errorWeight: components.errorWeight.getValue() / 10,
        });
        return true;
    }

    private async _export(): Promise<boolean> {
        // Gather data from the UI to send to the worker
        const components = UI.Get.layout.export.components;

        AppConsole.info(LOC('export.exporting_structure'));
        {
            // Instruct the worker to perform the job and await the result
            const resultExport = await this._workerController.execute({
                action: 'Export',
                params: {
                    exporter: components.export.getValue(),
                },
            });

            UI.Get.getActionButton(EAction.Export)?.resetLoading();
            if (this._handleErrors(resultExport)) {
                return false;
            }
            ASSERT(resultExport.action === 'Export');

            this._addWorkerMessagesToConsole(resultExport.messages);

            ASSERT(this._loadedFilename !== null)
            const fileExport = resultExport.result.files;
            if (fileExport.type === 'single') {
                download(fileExport.content, `${this._loadedFilename}_OTS${fileExport.extension}`);
            } else {
                const zipFiles = fileExport.regions.map((region) => {
                    // .nbt exports need to be lowercase
                    return { content: region.content, filename: `ots_${region.name}${fileExport.extension}` }
                });

                downloadAsZip(`${this._loadedFilename}_OTS.zip`, zipFiles);
            }
        }
        AppConsole.success(LOC('export.exported_structure'));

        AppAnalytics.Event('export', {
            exporter: components.export.getValue(),
        });
        return true;
    }

    /**
     * Check if the result from the worker is an error message
     * if so, handle it and return true, otherwise false.
     */
    private _handleErrors(result: TFromWorkerMessage) {
        if (result.action === 'KnownError') {
            AppConsole.error(result.error.message as TLocalisedString);
            return true;
        } else if (result.action === 'UnknownError') {
            AppConsole.error(LOC('something_went_wrong'));
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
            if (action === EAction.Import) {
                UI.Get.enableTo(EAction.Voxelise);
            } else {
                UI.Get.enableTo(action + 1);
            }
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

    public static draw() {
        Renderer.Get.update();
        UI.Get.tick(this.Get._workerController.isBusy());
        Renderer.Get.draw();
    }
}
