import { UI } from './ui/layout';
import { Renderer } from './renderer';
import { StatusHandler, StatusMessage } from './status';
import { UIMessageBuilder } from './ui/misc';
import { ArcballCamera } from './camera';

import path from 'path';
import { TWorkerJob, WorkerController } from './worker_controller';
import { TFromWorkerMessage, TToWorkerMessage } from './worker_types';
import { LOG } from './util/log_util';
import { ASSERT } from './util/error_util';
import { EAction } from './util';
import { AppConfig } from './config';
import { OutputStyle } from './ui/elements/output';

export class AppContext {
    private _ui: UI;
    private _workerController: WorkerController;
    public constructor() {
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
    }

    public do(action: EAction) {
        this._ui.disable(action);
        this._ui.cacheValues(action);

        const workerJob = this._getWorkerJob(action);
        const uiOutput = this._ui.getActionOutput(action);

        const jobCallback = (payload: TFromWorkerMessage) => {
            this._ui.enable(action);
            switch (payload.action) {
                case 'KnownError': {
                    const builder = uiOutput.getMessage();
                    {
                        builder.clear('action');
                        builder.addHeading('action', StatusHandler.Get.getDefaultFailureMessage(action), 'error')
                        builder.addItem('action', [ payload.error.message ], 'error');
                    }
                    uiOutput.setMessage(builder);
                    break;
                }
                case 'UnknownError': {
                    const builder = uiOutput.getMessage();
                    {
                        builder.clear('action');
                        builder.addHeading('action', StatusHandler.Get.getDefaultFailureMessage(action), 'error')
                        builder.addItem('action', [ 'Something unexpectedly went wrong...' ], 'error');
                    }
                    uiOutput.setMessage(builder);
                    break;
                }
                default: {
                    this._ui.enable(action + 1);
                    
                    const { builder, style } = this._getActionMessageBuilder(action, payload.statusMessages);
                    uiOutput.setMessage(builder, style as OutputStyle);
                    this._ui.getActionButton(action)
                        .removeLabelOverride()
                        .stopLoading();

                    if (workerJob.callback) {
                        workerJob.callback(payload);
                    }
                }
            }
        }

        this._workerController.addJob({
            id: workerJob.id,
            payload: workerJob.payload,
            callback: jobCallback,
        });
    }

    private _getActionMessageBuilder(action: EAction, statusMessages: StatusMessage[]) {
        const infoStatuses = statusMessages
            .filter(x => x.status === 'info')
            .map(x => x.message);
        const hasInfos = infoStatuses.length > 0;

        const warningStatuses = statusMessages
            .filter(x => x.status === 'warning')
            .map(x => x.message);
        const hasWarnings = warningStatuses.length > 0;

        const builder = new UIMessageBuilder();
        builder.addBold('action', [StatusHandler.Get.getDefaultSuccessMessage(action) + (hasInfos ? ':' : '')], 'success');
        builder.addItem('action', infoStatuses, 'success');

        if (hasWarnings) {
            builder.addHeading('action', 'There were some warnings:', 'warning');
            builder.addItem('action', warningStatuses, 'warning');
        }

        return { builder: builder, style: hasWarnings ? 'warning' : 'success' };
    }

    private _getWorkerJob(action: EAction): TWorkerJob {
        switch (action) {
            case EAction.Import:
                return this._import();
        }
        ASSERT(false);
    }

    private _import(): TWorkerJob {
        const uiElements = this._ui.layout.import.elements;

        const payload: TToWorkerMessage = {
            action: 'Import',
            params: {
                filepath: uiElements.input.getCachedValue()
            }
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is managed through `AppContext::do`, therefore
            // this callback is only called if the job is successful.
            ASSERT(payload.action === 'Import');

            if (payload.result.triangleCount < AppConfig.RENDER_TRIANGLE_THRESHOLD) {
                this._workerController.addJob(this._renderMesh());

                const builder = this._ui.getActionOutput(EAction.Import).getMessage();
                builder.clear('render');
                builder.addTask('render', `Rendering mesh...`);
                this._ui.getActionOutput(EAction.Import).setMessage(builder);
            } else {
                const builder = this._ui.getActionOutput(EAction.Import).getMessage();
                builder.clear('render');
                builder.addHeading('render', 'Render', 'warning');
                builder.addItem('render', [`Will not render mesh as its over ${AppConfig.RENDER_TRIANGLE_THRESHOLD} triangles.`], 'warning');
                this._ui.getActionOutput(EAction.Import).setMessage(builder);
            }
        };

        const builder = new UIMessageBuilder();
        builder.addTask('action', 'Loading mesh...');
        this._ui.getActionOutput(EAction.Import).setMessage(builder, 'none');

        return { id: 'Import', payload: payload, callback: callback };
    }

    private _renderMesh(): TWorkerJob {
        const payload: TToWorkerMessage = {
            action: 'RenderMesh',
            params: {}
        };

        const callback = (payload: TFromWorkerMessage) => {
            // This callback is not managed through `AppContext::do`, therefore
            // we need to check the payload is not an error
            if (payload.action === 'KnownError') {
                const builder = this._ui.getActionOutput(EAction.Import).getMessage()
                    .clear('render')
                    .addHeading('render', 'Could not draw the mesh', 'error')
                    .addItem('render', [payload.error.message], 'error');

                this._ui.getActionOutput(EAction.Import).setMessage(builder, 'warning');

            } else if (payload.action === 'UnknownError') {
                const builder = this._ui.getActionOutput(EAction.Import).getMessage()
                    .clear('render')
                    .addBold('render', ['Could not draw the mesh'], 'error');

                this._ui.getActionOutput(EAction.Import).setMessage(builder, 'warning');
            } else {
                const builder = this._ui.getActionOutput(EAction.Import).getMessage()
                    .clear('render')
                    .addBold('render', [ 'Rendered mesh' ], 'success');

                this._ui.getActionOutput(EAction.Import).setMessage(builder, 'success');

                ASSERT(payload.action === 'RenderMesh');
                Renderer.Get.useMesh(payload.result);
            }
        };

        return { id: 'RenderMesh', payload: payload, callback: callback };
    }

    /*
    private _voxelise() {
        ASSERT(this._loadedMesh);

        const uiElements = this._ui.layout.build.elements;
        const voxeliseParams: VoxeliseParams = {
            desiredHeight: uiElements.height.getDisplayValue(),
            useMultisampleColouring: uiElements.multisampleColouring.getCachedValue() === 'on',
            textureFiltering: uiElements.textureFiltering.getCachedValue() === 'linear' ? TextureFiltering.Linear : TextureFiltering.Nearest,
            enableAmbientOcclusion: uiElements.ambientOcclusion.getCachedValue() === 'on',
            voxelOverlapRule: uiElements.voxelOverlapRule.getCachedValue(),
            calculateNeighbours: uiElements.ambientOcclusion.getCachedValue() === 'on',
        };

        const voxeliserID: TVoxelisers = uiElements.voxeliser.getCachedValue();
        const voxeliser: IVoxeliser = VoxeliserFactory.GetVoxeliser(voxeliserID);

        TIME_START('Voxelising');
        {
            this._loadedVoxelMesh = voxeliser.voxelise(this._loadedMesh, voxeliseParams);
        }
        TIME_END('Voxelising');
        TIME_START('Render Voxel Mesh');
        {
            const voxelSize = 8.0 / voxeliseParams.desiredHeight;
            Renderer.Get.useVoxelMesh(this._loadedVoxelMesh, voxelSize, voxeliseParams.enableAmbientOcclusion);
        }
        TIME_END('Render Voxel Mesh');
    }

    private _assign() {
        ASSERT(this._loadedVoxelMesh);

        const uiElements = this._ui.layout.assign.elements;

        const atlasId = uiElements.textureAtlas.getCachedValue();
        const atlas = Atlas.load(atlasId);
        ASSERT(atlas, 'Could not load atlas');

        const paletteId = uiElements.blockPalette.getCachedValue();
        const palette = Palette.load(paletteId);
        ASSERT(palette);

        const blockMeshParams: BlockMeshParams = {
            textureAtlas: atlas,
            blockPalette: palette,
            blockAssigner: uiElements.dithering.getCachedValue(),
            colourSpace: ColourSpace.RGB,
            fallable: uiElements.fallable.getCachedValue() as FallableBehaviour,
        };

        this._loadedBlockMesh = BlockMesh.createFromVoxelMesh(this._loadedVoxelMesh, blockMeshParams);
        Renderer.Get.useBlockMesh(this._loadedBlockMesh);
    }

    private _export() {
        const exporterID: TExporters = this._ui.layout.export.elements.export.getCachedValue();
        const exporter: IExporter = ExporterFactory.GetExporter(exporterID);

        let filePath = remote.dialog.showSaveDialogSync({
            title: 'Save structure',
            buttonLabel: 'Save',
            filters: [exporter.getFormatFilter()],
        });

        ASSERT(this._loadedBlockMesh);
        if (filePath) {
            const fileExtension = '.' + exporter.getFileExtension();
            if (!filePath.endsWith(fileExtension)) {
                filePath += fileExtension;
            }
            exporter.export(this._loadedBlockMesh, filePath);
        }
    }
    */

    public draw() {
        Renderer.Get.update();
        this._ui.tick();
        Renderer.Get.draw();
    }
}
