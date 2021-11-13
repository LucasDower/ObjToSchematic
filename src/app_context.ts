import { Exporter, Litematic, Schematic } from "./schematic";
import { VoxelManager } from "./voxel_manager";
import { Toast, ToastStyle } from "./ui/toast";
import { ToggleableGroup } from "./ui/group";
import { Renderer } from "./renderer";
import { Modal } from "./ui/modal";
import { Mesh } from "./mesh";

import { remote } from "electron"; 
import path from "path";

interface ReturnStatus {
    message: string,
    style: ToastStyle,
    error?: unknown
}

export enum Action {
    Load,
    Voxelise,
    ExportSchematic,
    ExportLitematic,
    ConfirmExport
}

export class AppContext {

    private _voxelSize = 1.0;
    private _gl: WebGLRenderingContext;
    private _loadedMesh?: Mesh;
    private _groupVoxelise: ToggleableGroup;
    private _groupExport: ToggleableGroup;
    private _actionMap = new Map<Action, (() => ReturnStatus | void)>();

    private static _instance: AppContext;

    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const gl = (<HTMLCanvasElement>$("#canvas").get(0)).getContext("webgl");
        if (!gl) {
            throw Error("Could not load WebGL context");
        }
        this._gl = gl;

        this._actionMap.set(Action.Load,            () => { return this._load(); });
        this._actionMap.set(Action.Voxelise,        () => { return this._voxelise(); });
        this._actionMap.set(Action.ExportSchematic, () => { return this._preexport(new Schematic()); });
        this._actionMap.set(Action.ExportLitematic, () => { return this._preexport(new Litematic()); });

        this._groupVoxelise = new ToggleableGroup(["#inputVoxelSize", "#buttonVoxelise"], "#groupVoxelise", false);
        this._groupExport   = new ToggleableGroup(["#buttonSchematic", "#buttonLitematic"], "#groupExport", false);
    }

    public do(action: Action) {
        const status = this._actionMap.get(action)!();
        if (status) {
            if (status.error) {
                console.error(status.error);
            }
            Toast.show(status.message, status.style);
        }
    }
    
    private _load(): ReturnStatus {
        const files = remote.dialog.showOpenDialogSync({
            title: "Load Waveform .obj file",
            buttonLabel: "Load",
            filters: [{
                name: 'Waveform obj file',
                extensions: ['obj']
            }]
        });

        if (!files || files.length != 1) {
            return { message: "A single .obj file must be selected to load", style: ToastStyle.Failure };
        }
        
        const file = files[0];
        if (!file.endsWith(".obj") && !file.endsWith(".OBJ")) {
            return { message: "Files must be .obj format", style: ToastStyle.Failure };
        }
        
        const parsedPath = path.parse(file);
        
        try {
            this._loadedMesh = new Mesh(file, this._gl);
            this._loadedMesh.loadTextures(this._gl);
        } catch (err: unknown) {
            return { error: err, message: "Could not load mesh", style: ToastStyle.Failure };
        }
        
        try {
            const renderer = Renderer.Get;
            renderer.clear();
            renderer.registerMesh(this._loadedMesh);
            renderer.compile();
        } catch (err: unknown) {
            return { message: "Could not render mesh", style: ToastStyle.Failure };
        }
    
        $('#inputFile').prop("value", parsedPath.base);

        this._groupVoxelise.setEnabled(true);
        this._groupExport.setEnabled(false);
    
        return { message: "Loaded successfully", style: ToastStyle.Success };
    }

    private _voxelise(): ReturnStatus {
        const newVoxelSize: number = parseFloat($("#inputVoxelSize").prop('value'));
        if (newVoxelSize < 0.001) {
            return { message: "Voxel size must be at least 0.001", style: ToastStyle.Failure };
        }
        this._voxelSize = newVoxelSize;
        
        try {
            const voxelManager = VoxelManager.Get;
            voxelManager.setVoxelSize(this._voxelSize);
            voxelManager.voxeliseMesh(this._loadedMesh!);
        
            const renderer = Renderer.Get;
            renderer.clear();
            renderer.registerVoxelMesh();
            renderer.compile();
        } catch (err: any) {
            return { error: err, message: "Could not register voxel mesh", style: ToastStyle.Failure };
        }

        this._groupExport.setEnabled(true);
        return { message: "Voxelised successfully", style: ToastStyle.Success };
    }

    private _preexport(exporter: Exporter) {
        const voxelManager = VoxelManager.Get;

        console.log(voxelManager.min, voxelManager.max);
        const schematicHeight = Math.ceil(voxelManager.max.z - voxelManager.min.z);

        let message = "";
        if (schematicHeight > 320) {
            message += `Note, this structure is <b>${schematicHeight}</b> blocks tall, this is larger than the height of a Minecraft world (320 in 1.17, 256 in <=1.16). `;
        }

        const formatDisclaimer = exporter.getFormatDisclaimer();
        if (formatDisclaimer) {
            message += "\n" + formatDisclaimer;
        }

        if (message.length == 0) {
            return this._export(exporter);
        } else {
            Modal.setButton("Export", () => { this._export(exporter); });
            Modal.show(message);
        }
    }

    private _export(exporter: Exporter): ReturnStatus {
        const filePath = remote.dialog.showSaveDialogSync({
            title: "Save structure",
            buttonLabel: "Save",
            filters: [ exporter.getFormatFilter() ]
        });
    
        if (filePath === undefined) {
            return { message: "Output cancelled", style: ToastStyle.Success };
        }
    
        try {
            exporter.export(filePath);
        } catch (err: unknown) {
            return { error: err, message: "Failed to export", style: ToastStyle.Failure };
        }

        return { message: "Successfully exported", style: ToastStyle.Success };
    }

    public draw() {
        Renderer.Get.draw();
    }

}