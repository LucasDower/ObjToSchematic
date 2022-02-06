import { UI } from './ui/layout';
import { Litematic, Schematic } from './schematic';
import { VoxelManager } from './voxel_manager';
import { Renderer } from './renderer';
import { Mesh } from './mesh';
import { ObjImporter } from './importers/obj_importer';
import { assert, CustomError, CustomWarning } from './util';

import { remote } from 'electron';

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
    public loadedMesh?: Mesh;

    private _actionMap = new Map<Action, () => void>();

    private static _instance: AppContext;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl');
        if (!gl) {
            throw Error('Could not load WebGL context');
        }

        this._actionMap.set(Action.Import, () => {
            return this._import();
        });
        this._actionMap.set(Action.Simplify, () => {
            return this._simplify();
        });
        this._actionMap.set(Action.Voxelise, () => {
            return this._voxelise();
        });
        this._actionMap.set(Action.Palette, () => {
            return this._palette();
        } );
        this._actionMap.set(Action.Export, () => {
            return this._export();
        });

        UI.Get.build();
        UI.Get.registerEvents();

        UI.Get.disable(Action.Simplify);
    }

    public do(action: Action) {
        UI.Get.disable(action + 1);
        const groupName = UI.Get.uiOrder[action];
        try {
            const delegate = this._actionMap.get(action)!;
            delegate();
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof CustomError) {
                UI.Get.layoutDull[groupName].output.setMessage(err.message, ActionReturnType.Failure);
            } else if (err instanceof CustomWarning) {
                UI.Get.layoutDull[groupName].output.setMessage(err.message, ActionReturnType.Warning);
            } else {
                UI.Get.layoutDull[groupName].output.setMessage(ReturnMessages.get(action)!.onFailure, ActionReturnType.Failure);
            }
            return;
        }
        UI.Get.enable(action + 1);
        UI.Get.layoutDull[groupName].output.setMessage(ReturnMessages.get(action)!.onSuccess, ActionReturnType.Success);
    }

    private _import() {
        const objPath = UI.Get.layout.import.elements.input.getValue();

        this.loadedMesh = new ObjImporter().createMesh(objPath);
        Renderer.Get.useMesh();
    }

    private _simplify() {
        assert(false);
    }

    private _voxelise() {
        const desiredHeight = UI.Get.layout.build.elements.height.getValue();
        const ambientOcclusion = UI.Get.layout.build.elements.ambientOcclusion.getValue() === 'on';

        VoxelManager.Get.voxeliseMesh(desiredHeight, ambientOcclusion);
        VoxelManager.Get.assignBlankBlocks();
        Renderer.Get.useVoxelMesh();
    }

    private _palette() {
        const ditheringEnabled = UI.Get.layout.palette.elements.dithering.getValue() === 'on';

        VoxelManager.Get.assignBlocks(ditheringEnabled);
        Renderer.Get.useVoxelMesh();
    }

    private _export() {
        const exportFormat = UI.Get.layout.export.elements.export.getValue();
        const exporter = (exportFormat === 'schematic') ? new Schematic() : new Litematic();

        const filePath = remote.dialog.showSaveDialogSync({
            title: 'Save structure',
            buttonLabel: 'Save',
            filters: [exporter.getFormatFilter()],
        });

        if (filePath) {
            exporter.export(filePath);
        }
    }

    public draw() {
        Renderer.Get.draw();
    }
}
