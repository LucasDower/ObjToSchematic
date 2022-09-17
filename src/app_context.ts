import { remote } from 'electron';
import path from 'path';

import { FallableBehaviour } from './block_mesh';
import { ArcballCamera } from './camera';
import { AppConfig } from './config';
import { EAppEvent, EventManager } from './event';
import { IExporter } from './exporters/base_exporter';
import { ExporterFactory, TExporters } from './exporters/exporters';
import { Renderer } from './renderer';
import { StatusHandler, StatusMessage } from './status';
import { TextureFiltering } from './texture';
import { OutputStyle } from './ui/elements/output';
import { UI } from './ui/layout';
import { UIMessageBuilder } from './ui/misc';
import { ColourSpace, EAction } from './util';
import { ASSERT } from './util/error_util';
import { LOG, LOG_ERROR, Logger } from './util/log_util';
import { TWorkerJob, WorkerController } from './worker_controller';
import { TFromWorkerMessage, TToWorkerMessage } from './worker_types';

export class AppContext {
    private _ui: UI;
    private _workerController: WorkerController;
    private _lastAction?: EAction;

    public constructor() {
        Logger.Get.enableLOG();
        Logger.Get.enableLOGMAJOR();
        Logger.Get.enableLOGWARN();

        const gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl');
        if (!gl) {
            throw Error('Could not load WebGL context');
        }

        this._ui = new UI(this);
        this._ui.build();
        this._ui.registerEvents();
        this._ui.disable(EAction.Voxelise);

        this._workerController = new WorkerController(path.resolve(__dirname, 'worker_interface.js'));

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

        builder.addItem('action', infoStatuses, 'success');
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

            if (payload.result.triangleCount < AppConfig.RENDER_TRIANGLE_THRESHOLD) {
                this._workerController.addJob(this._renderMesh());
                outputElement.setTaskInProgress('render', '[Renderer]: Processing...');
            } else {
                const message = `Will not render mesh as its over ${AppConfig.RENDER_TRIANGLE_THRESHOLD.toLocaleString()} triangles.`;
                outputElement.setTaskComplete('render', '[Renderer]: Stopped', [message], 'warning');
            }
        };

        return { id: 'Import', payload: payload, callback: callback };
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
                voxeliser: uiElements.voxeliser.getCachedValue(),
                desiredHeight: uiElements.desiredHeight.getCachedValue(),
                useMultisampleColouring: uiElements.multisampleColouring.getCachedValue() === 'on',
                textureFiltering: uiElements.textureFiltering.getCachedValue() === 'linear' ? TextureFiltering.Linear : TextureFiltering.Nearest,
                enableAmbientOcclusion: uiElements.ambientOcclusion.getCachedValue() === 'on',
                voxelOverlapRule: uiElements.voxelOverlapRule.getCachedValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            ASSERT(payload.action === 'Voxelise');
            const outputElement = this._ui.getActionOutput(EAction.Voxelise);

            this._workerController.addJob(this._renderVoxelMesh());
            outputElement.setTaskInProgress('render', '[Renderer]: Processing...');
        };

        return { id: 'Voxelise', payload: payload, callback: callback };
    }

    private _renderVoxelMesh(): TWorkerJob {
        const uiElements = this._ui.layout.voxelise.elements;

        const payload: TToWorkerMessage = {
            action: 'RenderVoxelMesh',
            params: {
                enableAmbientOcclusion: uiElements.ambientOcclusion.getCachedValue() === 'on',
                desiredHeight: uiElements.desiredHeight.getCachedValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is not managed through `AppContext::do`, therefore
            // we need to check the payload is not an error
            this._ui.enableTo(EAction.Assign);

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
                    break;
                }
                default: {
                    ASSERT(payload.action === 'RenderVoxelMesh');
                    Renderer.Get.useVoxelMesh(payload.result);

                    this._ui.getActionOutput(EAction.Voxelise).setTaskComplete(
                        'render',
                        '[Renderer]: Succeeded',
                        [],
                        'success',
                    );
                }
            }
        };

        return { id: 'RenderVoxelMesh', payload: payload, callback: callback };
    }

    private _assign(): TWorkerJob {
        const uiElements = this._ui.layout.assign.elements;

        this._ui.getActionOutput(EAction.Assign)
            .setTaskInProgress('action', '[Block Mesh]: Loading...');

        const payload: TToWorkerMessage = {
            action: 'Assign',
            params: {
                textureAtlas: uiElements.textureAtlas.getCachedValue(),
                blockPalette: uiElements.blockPalette.getCachedValue(),
                blockAssigner: uiElements.dithering.getCachedValue(),
                colourSpace: ColourSpace.RGB,
                fallable: uiElements.fallable.getCachedValue() as FallableBehaviour,
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            ASSERT(payload.action === 'Assign');

            const outputElement = this._ui.getActionOutput(EAction.Assign);

            this._workerController.addJob(this._renderBlockMesh());
            outputElement.setTaskInProgress('render', '[Renderer]: Processing...');
        };

        return { id: 'Assign', payload: payload, callback: callback };
    }

    private _renderBlockMesh(): TWorkerJob {
        const uiElements = this._ui.layout.assign.elements;

        const payload: TToWorkerMessage = {
            action: 'RenderBlockMesh',
            params: {
                textureAtlas: uiElements.textureAtlas.getCachedValue(),
            },
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is not managed through `AppContext::do`, therefore
            // we need to check the payload is not an error
            this._ui.enableTo(EAction.Export);

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
                    break;
                }
                default: {
                    ASSERT(payload.action === 'RenderBlockMesh');
                    Renderer.Get.useBlockMesh(payload.result);

                    this._ui.getActionOutput(EAction.Assign).setTaskComplete(
                        'render',
                        '[Renderer]: Succeeded',
                        [],
                        'success',
                    );
                }
            }
        };

        return { id: 'RenderBlockMesh', payload: payload, callback: callback };
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
        this._ui.tick();
        Renderer.Get.draw();
    }
}
