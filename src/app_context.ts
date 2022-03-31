import { UI } from './ui/layout';
import { Litematic, Schematic } from './schematic';
import { Renderer } from './renderer';
import { Mesh } from './mesh';
import { ObjImporter } from './importers/obj_importer';
import { ASSERT, ColourSpace, CustomError, CustomWarning, LOG, LOG_ERROR, LOG_WARN } from './util';

import { remote } from 'electron';
import { VoxelMesh, VoxelMeshParams } from './voxel_mesh';
import { BlockMesh, BlockMeshParams } from './block_mesh';
import { TextureFiltering } from './texture';
import { RayVoxeliser } from './voxelisers/ray-voxeliser';
import { IVoxeliser } from './voxelisers/base-voxeliser';
import { NormalCorrectedRayVoxeliser } from './voxelisers/normal-corrected-ray-voxeliser';
import { BVHRayVoxeliser } from './voxelisers/bvh-ray-voxeliser';

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
    private _ui: UI;

    private _actionMap = new Map<Action, {
        action: () => void;
        onFailure?: () => void
    }>();

    public constructor() {
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

        this._ui = new UI(this);
        this._ui.build();
        this._ui.registerEvents();

        // this._ui.disablePost(Action.Import);
        this._ui.disable(Action.Simplify);

        Renderer.Get.toggleIsGridEnabled();
    }

    public do(action: Action) {
        this._ui.disable(action + 1);
        this._warnings = [];
        const groupName = this._ui.uiOrder[action];
        LOG(`Doing ${action}`);
        this._ui.cacheValues(action);
        const delegate = this._actionMap.get(action)!;
        try {
            delegate.action();
        } catch (err: any) {
            LOG_ERROR(err);
            if (err instanceof CustomError) {
                this._ui.layoutDull[groupName].output.setMessage(err.message, ActionReturnType.Failure);
            } else if (err instanceof CustomWarning) {
                this._ui.layoutDull[groupName].output.setMessage(err.message, ActionReturnType.Warning);
            } else {
                this._ui.layoutDull[groupName].output.setMessage(ReturnMessages.get(action)!.onFailure, ActionReturnType.Failure);
            }
            if (delegate.onFailure) {
                delegate.onFailure();
            }
            return;
        }

        const successMessage = ReturnMessages.get(action)!.onSuccess;
        if (this._warnings.length !== 0) {
            const allWarnings = this._warnings.join('<br>');
            this._ui.layoutDull[groupName].output.setMessage(successMessage + `, with ${this._warnings.length} warning(s):` + '<br><b>' + allWarnings + '</b>', ActionReturnType.Warning);
        } else {
            this._ui.layoutDull[groupName].output.setMessage(successMessage, ActionReturnType.Success);
        }

        LOG(`Finished ${action}`);
        this._ui.enable(action + 1);
    }

    private _import() {
        const uiElements = this._ui.layout.import.elements;
        const filePath = uiElements.input.getCachedValue();

        const importer = new ObjImporter();
        importer.parseFile(filePath);
        this._loadedMesh = importer.toMesh();
        this._loadedMesh.processMesh();
        Renderer.Get.useMesh(this._loadedMesh);

        this._warnings = this._loadedMesh.getWarnings();
    }

    private _simplify() {
        ASSERT(false);
    }

    private _voxelise() {
        ASSERT(this._loadedMesh);
        
        const uiElements = this._ui.layout.build.elements;
        const voxelMeshParams: VoxelMeshParams = {
            desiredHeight: uiElements.height.getCachedValue() as number,
            useMultisampleColouring: uiElements.multisampleColouring.getCachedValue() === 'on',
            textureFiltering: uiElements.textureFiltering.getCachedValue() === 'linear' ? TextureFiltering.Linear : TextureFiltering.Nearest,
            
        };
        const ambientOcclusionEnabled = uiElements.ambientOcclusion.getCachedValue() === 'on';

        const voxeliserID = uiElements.voxeliser.getCachedValue();
        let voxeliser: IVoxeliser;
        if (voxeliserID === 'raybased') {
            voxeliser = new RayVoxeliser();
        } else if (voxeliserID === 'bvhraybased') {
            voxeliser = new BVHRayVoxeliser();
        } else {
            ASSERT(voxeliserID === 'normalcorrectedraybased');
            voxeliser = new NormalCorrectedRayVoxeliser();
        }
        
        this._loadedVoxelMesh = voxeliser.voxelise(this._loadedMesh, voxelMeshParams);
        Renderer.Get.useVoxelMesh(this._loadedVoxelMesh, ambientOcclusionEnabled);
    }

    private _palette() {
        ASSERT(this._loadedVoxelMesh);

        const uiElements = this._ui.layout.palette.elements;
        const blockMeshParams: BlockMeshParams = {
            textureAtlas: uiElements.textureAtlas.getCachedValue(),
            blockPalette: uiElements.blockPalette.getCachedValue(),
            ditheringEnabled: uiElements.dithering.getCachedValue() === 'on',
            colourSpace: uiElements.colourSpace.getCachedValue() === 'rgb' ? ColourSpace.RGB : ColourSpace.LAB,
        };

        this._loadedBlockMesh = BlockMesh.createFromVoxelMesh(this._loadedVoxelMesh, blockMeshParams);
        Renderer.Get.useBlockMesh(this._loadedBlockMesh);
    }

    private _export() {
        const exportFormat = this._ui.layout.export.elements.export.getCachedValue() as string;
        const exporter = (exportFormat === 'schematic') ? new Schematic() : new Litematic();

        const filePath = remote.dialog.showSaveDialogSync({
            title: 'Save structure',
            buttonLabel: 'Save',
            filters: [exporter.getFormatFilter()],
        });

        ASSERT(this._loadedBlockMesh);
        if (filePath) {
            exporter.export(this._loadedBlockMesh, filePath);
        }

        this._warnings = exporter.getWarnings();
    }

    public draw() {
        Renderer.Get.update();
        Renderer.Get.draw();
    }

    public getLoadedMesh() {
        return this._loadedMesh;
    }

    public addWarning(warning: string) {
        LOG_WARN(warning);
        this._warnings.push(warning);
    }
}
