import { UI } from './ui/layout';
import { Litematic, Schematic } from './schematic';
import { Renderer } from './renderer';
import { Mesh } from './mesh';
import { ObjImporter } from './importers/obj_importer';
import { ASSERT, CustomError, CustomWarning, LOG, LOG_ERROR } from './util';

import { remote } from 'electron';
import { VoxelMesh } from './voxel_mesh';
import { BlockMesh } from './block_mesh';
import { TextureFiltering } from './texture';

/* eslint-disable */
export enum ActionReturnType {
    Success,
    Warning,
    Failure
}
/* eslint-enable */
export interface ReturnStatus {
    message: string,
    type: ActionReturnType,
    error?: unknown
}

/* eslint-disable */
export enum Action {
    Import = 0,
    Simplify = 1,
    Voxelise = 2,
    Palette = 3,
    Export = 4,
    MAX = 5,
}
/* eslint-enable */

const ReturnMessages = new Map<Action, { onSuccess: string, onFailure: string }>();
ReturnMessages.set(Action.Import,   { onSuccess: 'Loaded mesh successfully',        onFailure: 'Failed to load mesh' });
ReturnMessages.set(Action.Simplify, { onSuccess: 'Simplified mesh successfully',    onFailure: 'Failed to simplify mesh' });
ReturnMessages.set(Action.Voxelise, { onSuccess: 'Voxelised mesh successfully',     onFailure: 'Failed to voxelise mesh' });
ReturnMessages.set(Action.Palette,  { onSuccess: 'Assigned blocks successfully',    onFailure: 'Failed to assign blocks' });
ReturnMessages.set(Action.Export,   { onSuccess: 'Exported structure successfully', onFailure: 'Failed to export structure' });

export class AppContext {
    private _loadedMesh?: Mesh;
    private _loadedVoxelMesh?: VoxelMesh;
    private _loadedBlockMesh?: BlockMesh;
    private _warnings: string[];

    private _actionMap = new Map<Action, {
        action: () => void;
        onFailure?: () => void
    }>();

    private static _instance: AppContext;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl');
        if (!gl) {
            throw Error('Could not load WebGL context');
        }

        this._warnings = [];
        this._actionMap.set(Action.Import, {
            action: () => {
                return this._import();
            },
            onFailure: () => {
                this._loadedMesh = undefined;
            },
        });
        this._actionMap.set(Action.Simplify, {
            action: () => {
                return this._simplify();
            },
        });
        this._actionMap.set(Action.Voxelise, {
            action: () => {
                return this._voxelise();
            },
            onFailure: () => {
                this._loadedVoxelMesh = undefined;
            },
        });
        this._actionMap.set(Action.Palette, {
            action: () => {
                return this._palette();
            },
            onFailure: () => {
                this._loadedBlockMesh = undefined;
            },
        });
        this._actionMap.set(Action.Export, {
            action: () => {
                return this._export();
            },
        });

        UI.Get.build();
        UI.Get.registerEvents();

        UI.Get.disable(Action.Simplify);
    }

    public do(action: Action) {
        UI.Get.disable(action + 1);
        this._warnings = [];
        const groupName = UI.Get.uiOrder[action];
        LOG(`Doing ${action}`);
        const delegate = this._actionMap.get(action)!;
        try {
            delegate.action();
        } catch (err: any) {
            LOG_ERROR(err);
            if (err instanceof CustomError) {
                UI.Get.layoutDull[groupName].output.setMessage(err.message, ActionReturnType.Failure);
            } else if (err instanceof CustomWarning) {
                UI.Get.layoutDull[groupName].output.setMessage(err.message, ActionReturnType.Warning);
            } else {
                UI.Get.layoutDull[groupName].output.setMessage(ReturnMessages.get(action)!.onFailure, ActionReturnType.Failure);
            }
            if (delegate.onFailure) {
                delegate.onFailure();
            }
            return;
        }

        const successMessage = ReturnMessages.get(action)!.onSuccess;
        if (this._warnings.length !== 0) {
            const allWarnings = this._warnings.join('<br>');
            UI.Get.layoutDull[groupName].output.setMessage(successMessage + ', with warnings:' + '<br><b>' + allWarnings + '</b>', ActionReturnType.Warning);
        } else {
            UI.Get.layoutDull[groupName].output.setMessage(successMessage, ActionReturnType.Success);
        }

        LOG(`Finished ${action}`);
        UI.Get.enable(action + 1);
    }

    private _import() {
        const objPath = UI.Get.layout.import.elements.input.getValue();

        this._loadedMesh = new ObjImporter().createMesh(objPath);
        Renderer.Get.useMesh(this._loadedMesh);
        LOG(this._loadedMesh);
        LOG(Renderer.Get);
    }

    private _simplify() {
        ASSERT(false);
    }

    private _voxelise() {
        const desiredHeight = UI.Get.layout.build.elements.height.getValue();
        const ambientOcclusion = UI.Get.layout.build.elements.ambientOcclusion.getValue() === 'on';
        const multisampleColouring = UI.Get.layout.build.elements.multisampleColouring.getValue() === 'on';
        const textureFiltering = UI.Get.layout.build.elements.textureFiltering.getValue() === 'nearest' ? TextureFiltering.Nearest : TextureFiltering.Linear;

        ASSERT(this._loadedMesh);
        this._loadedVoxelMesh = new VoxelMesh(desiredHeight);
        this._loadedVoxelMesh.voxelise(this._loadedMesh, multisampleColouring, textureFiltering);

        Renderer.Get.useVoxelMesh(this._loadedVoxelMesh, ambientOcclusion);
    }

    private _palette() {
        const ditheringEnabled = UI.Get.layout.palette.elements.dithering.getValue() === 'on';

        ASSERT(this._loadedVoxelMesh);
        this._loadedBlockMesh = new BlockMesh(ditheringEnabled);
        this._loadedBlockMesh.assignBlocks(this._loadedVoxelMesh);

        Renderer.Get.useBlockMesh(this._loadedBlockMesh);
    }

    private _export() {
        const exportFormat = UI.Get.layout.export.elements.export.getValue();
        const exporter = (exportFormat === 'schematic') ? new Schematic() : new Litematic();

        if (exportFormat === 'schematic') {
            this._warnings.push(`
                The .schematic format does not support newer Minecraft blocks.
                For now, all blocks are exported as Stone blocks until a block palette
                is available that only uses supported blocks.
            `);
        }

        const filePath = remote.dialog.showSaveDialogSync({
            title: 'Save structure',
            buttonLabel: 'Save',
            filters: [exporter.getFormatFilter()],
        });

        ASSERT(this._loadedBlockMesh);
        if (filePath) {
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
