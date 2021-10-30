import { Renderer } from "./renderer";
import { Mesh } from "./mesh";
import { VoxelManager } from "./voxel_manager";
import { Vector3 } from "./vector.js";
import { Schematic, Litematic, Exporter } from "./schematic";
//const dialog = from 'electron').remote.dialog;
import {remote} from 'electron'; 
import * as bootstrap from "bootstrap";

enum ToastColour {
    RED = "bg-danger",
    ORANGE = "bg-warning",
    GREEN = "bg-success"
}

export enum ExportFormat {
    SCHEMATIC = "schematic",
    LITEMATIC = "litematic"
}


export class AppContext {

    private _voxelSize: number;
    private _gl: WebGLRenderingContext;
    private _loadedMesh?: Mesh;

    private _toast: bootstrap.Toast;
    private _modalExport: bootstrap.Modal;
    //private _modalVoxelise: bootstrap.Modal;
    private _modalGeneral: bootstrap.Modal;
    private _cachedFormat?: ExportFormat;

    private static _instance: AppContext;

    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {     
        this._voxelSize = $("#voxelInput").prop("value");
        
        const gl = (<HTMLCanvasElement>$("#canvas").get(0)).getContext("webgl");
        if (!gl) {
            throw Error("Could not load WebGL context");
        }
        this._gl = gl;

        this._toast = new bootstrap.Toast(<HTMLElement>document.getElementById('toast'), {delay: 3000});
        this._modalExport = new bootstrap.Modal(<HTMLElement>document.getElementById('modalExport'), {});
        //this._modalVoxelise = new bootstrap.Modal(<HTMLElement>document.getElementById('modalVoxelise'), {});
        this._modalGeneral = new bootstrap.Modal(<HTMLElement>document.getElementById('modalGeneral'), {});

        //this._showModalGeneral("Note that in this current version, all blocks in the schematic will be exported as Stone blocks. This will be changed in version 0.4.");
    }

    public load() {
        const files = $("#fileInput").prop("files");

        if (files.length != 1) {
            return;
        }
    
        const file = files[0];
        if (!file.name.endsWith(".obj") && !file.name.endsWith(".OBJ")) {
            throw Error("Files must be .obj format");
            this._showToast("Files must be .obj format", ToastColour.RED);
            return;
        }
    
        try {
            this._loadedMesh = new Mesh(files[0].path, this._gl);
        } catch (err: any) {
            this._showToast(err.message, ToastColour.RED);
            console.log(err);
            return;
        }
        
        const renderer = Renderer.Get;
        renderer.clear();
        renderer.registerMesh(this._loadedMesh);
        renderer.compile();
    
        $('#voxelInput').prop('disabled', false);
        $('#voxelBtn').prop('disabled', false);
        $('#splitBtn').prop('disabled', true);

        $('#exportSchematic').prop('disabled', true);
        $('#exportLitematic').prop('disabled', true);
    
        this._showToast(`Successfully loaded ${file.name}`, ToastColour.GREEN);
    }

    /*
    split() {
        this.voxelSize /= 2;
        $("#voxelInput").prop('value', this.voxelSize);

        this.voxelManager.splitVoxels();

        this.renderer.clear();
        this.renderer.registerVoxelMesh(this.voxelManager);
        this.renderer.compile();
    }
    */

    public voxeliseDisclaimer() {
        //this._modalVoxelise.show();
        this.voxelise();
    }

    public voxelise() {
        const newVoxelSize = $("#voxelInput").prop('value');
        if (newVoxelSize < 0.001) {
            this._showToast("Voxel size must be at least 0.001", ToastColour.RED);
            return;
        }
        this._voxelSize = newVoxelSize;

        if (!this._loadedMesh) {
            return;
        }
        
        try {
            const voxelManager = VoxelManager.Get;
            voxelManager.clear();
            voxelManager.setVoxelSize(this._voxelSize);
            voxelManager.voxeliseMesh(this._loadedMesh);
        
            const renderer = Renderer.Get;
            renderer.clear();
            renderer.registerVoxelMesh();
            renderer.compile();
        } catch (err: any) {
            this._showToast(err.message, ToastColour.RED);
            console.error(err);
            return;
        }

        $('#exportSchematic').prop('disabled', false);
        $('#exportLitematic').prop('disabled', false);
    
        this._showToast("Voxelised successfully", ToastColour.GREEN);
    }

    public exportDisclaimer(exportFormat: ExportFormat) {
        const voxelManager = VoxelManager.Get;
        const schematicHeight = Math.ceil(voxelManager.maxZ - voxelManager.minZ);

        let message = "";
        if (schematicHeight > 320) {
            message += `Note, this structure is <b>${schematicHeight}</b> blocks tall, this is larger than the height of a Minecraft world (320 in 1.17, 256 in <=1.16). `;
        }
        if (exportFormat == ExportFormat.SCHEMATIC) {
            message += "Schematic files only support pre-1.13 blocks. As a result, all blocks will be exported as Stone. To export the blocks use the .litematic format with the Litematica mod.";
        }

        this._cachedFormat = exportFormat;

        if (message.length == 0) {
            this.export();
        } else {
            this._showModalExport(message);
        }
    }

    public export() {
        this._modalExport.hide();

        const filePath = remote.dialog.showSaveDialogSync({
            title: "Save structure",
            buttonLabel: "Save",
            filters: this._cachedFormat == ExportFormat.SCHEMATIC ? [{
                name: 'Schematic',
                extensions: ['schematic']
            }] : [{
                name: 'Litematic',
                extensions: ['litematic']
            }]
        });
    
        if (filePath === undefined) {
            console.error("no path");
            return;
        }
    
        try {
            let exporter: Exporter;
            if (this._cachedFormat == ExportFormat.SCHEMATIC) {
                exporter = new Schematic();
            } else { 
                exporter = new Litematic();
            }
            exporter.export(filePath);
        } catch (err) {
            this._showToast("Failed to export", ToastColour.RED);
            console.error(err);
            return;
        }
        
        this._showToast("Successfully saved", ToastColour.GREEN);
    }

    public draw() {
        Renderer.Get.draw(VoxelManager.Get._voxelSize);
    }

    private _showToast(text: string, colour: ToastColour) {
        $("#toast").removeClass(ToastColour.RED);
        $("#toast").removeClass(ToastColour.ORANGE);
        $("#toast").removeClass(ToastColour.GREEN);
        $("#toast").addClass(colour);
    
        $("#toastText").html(text);
        //$("#toast").toast({ delay: 3000 });
        //$("#toast").toast('show');
        this._toast.show();
    }

    private _showModalExport(text: string) {
        $("#modalExportText").html(text);
        this._modalExport.show();
    }

    private _showModalGeneral(text: string) {
        $("#modalGeneralText").html(text);
        this._modalGeneral.show();
    }

}

module.exports.AppContext = AppContext;