import { UI } from './ui/layout';
import { Renderer } from './renderer';
import { Mesh } from './mesh';
import { ObjImporter } from './importers/obj_importer';
import { ASSERT, ColourSpace, AppError, LOG, LOG_ERROR, TIME_START, TIME_END } from './util';

import { remote } from 'electron';
import { VoxelMesh } from './voxel_mesh';
import { BlockMesh, BlockMeshParams, FallableBehaviour } from './block_mesh';
import { TextureFiltering } from './texture';
import { IVoxeliser } from './voxelisers/base-voxeliser';
import { StatusHandler } from './status';
import { UIMessageBuilder } from './ui/misc';
import { OutputStyle } from './ui/elements/output';
import { IExporter } from './exporters/base_exporter';
import { TVoxelisers, VoxeliseParams, VoxeliserFactory } from './voxelisers/voxelisers';
import { ExporterFactory, TExporters } from './exporters/exporters';

/* eslint-disable */
export enum EAction {
    Import = 0,
    Simplify = 1,
    Voxelise = 2,
    Assign = 3,
    Export = 4,
    MAX = 5,
}
/* eslint-enable */

export class AppContext {
    private _loadedMesh?: Mesh;
    private _loadedVoxelMesh?: VoxelMesh;
    private _loadedBlockMesh?: BlockMesh;
    private _ui: UI;

    private _actionMap = new Map<EAction, {
        action: () => void;
        onFailure?: () => void
    }>();

    public constructor() {
        const gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl');
        if (!gl) {
            throw Error('Could not load WebGL context');
        }

        this._actionMap = new Map([
            [
                EAction.Import, {
                    action: () => { return this._import(); },
                    onFailure: () => { this._loadedMesh = undefined; },
                },
            ],
            [
                EAction.Simplify, {
                    action: () => { return this._simplify(); },
                },
            ],
            [
                EAction.Voxelise, {
                    action: () => { return this._voxelise(); },
                    onFailure: () => { this._loadedVoxelMesh = undefined; },
                },
            ],
            [
                EAction.Assign, {
                    action: () => { return this._assign(); },
                    onFailure: () => { this._loadedBlockMesh = undefined; },
                },
            ],
            [
                EAction.Export, {
                    action: () => { return this._export(); },
                },
            ],
        ]);

        this._ui = new UI(this);
        this._ui.build();
        this._ui.registerEvents();

        this._ui.disable(EAction.Simplify);

        Renderer.Get.toggleIsGridEnabled();
        Renderer.Get.toggleIsAxesEnabled();
    }

    public do(action: EAction) {
        LOG(`Doing ${action}`);
        const groupName = this._ui.uiOrder[action];
        this._ui.disable(action + 1);
        this._ui.cacheValues(action);
        StatusHandler.Get.clear();

        const delegate = this._actionMap.get(action)!;
        try {
            delegate.action();
        } catch (error: any) {
            // On failure...
            LOG_ERROR(error);
            const message = new UIMessageBuilder();
            if (error instanceof AppError) {
                message.addHeading(StatusHandler.Get.getDefaultFailureMessage(action));
                message.add(error.message);
            } else {
                message.addBold(StatusHandler.Get.getDefaultFailureMessage(action));
            }
            this._ui.layoutDull[groupName].output.setMessage(message, 'error');
            delegate.onFailure?.();
            return;
        }

        // On success...
        const message = new UIMessageBuilder();
        if (StatusHandler.Get.hasStatusMessages('info')) {
            message.addHeading(StatusHandler.Get.getDefaultSuccessMessage(action));
            message.add(...StatusHandler.Get.getStatusMessages('info'));
        } else {
            message.addBold(StatusHandler.Get.getDefaultSuccessMessage(action));
        }

        let returnStyle: OutputStyle = 'success';
        if (StatusHandler.Get.hasStatusMessages('warning')) {
            message.addHeading('There were some warnings');
            message.add(...StatusHandler.Get.getStatusMessages('warning'));
            returnStyle = 'warning';
        }
        
        this._ui.layoutDull[groupName].output.setMessage(message, returnStyle);

        this._ui.enable(action + 1);
        LOG(`Finished ${action}`);
    }

    private _import() {
        const uiElements = this._ui.layout.import.elements;
        const filePath = uiElements.input.getCachedValue();

        const importer = new ObjImporter();
        importer.parseFile(filePath);
        this._loadedMesh = importer.toMesh();
        this._loadedMesh.processMesh();
        Renderer.Get.useMesh(this._loadedMesh);
    }

    private _simplify() {
        ASSERT(false);
    }

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
        const blockMeshParams: BlockMeshParams = {
            textureAtlas: uiElements.textureAtlas.getCachedValue(),
            blockPalette: uiElements.blockPalette.getCachedValue(),
            ditheringEnabled: uiElements.dithering.getCachedValue() === 'on',
            colourSpace: uiElements.colourSpace.getCachedValue() === 'rgb' ? ColourSpace.RGB : ColourSpace.LAB,
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

    public draw() {
        Renderer.Get.update();
        Renderer.Get.draw();
    }

    public getLoadedMesh() {
        return this._loadedMesh;
    }
}
