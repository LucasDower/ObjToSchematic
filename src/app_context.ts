import { Schematic, Litematic, Exporter } from "./schematic";
import { VoxelManager } from "./voxel_manager";
import { Renderer } from "./renderer";
import { Toast, ToastStyle } from "./ui/toast";
import { Modal } from "./ui/modal";
import { Mesh } from "./mesh";

import { remote } from 'electron'; 
import path from "path";

enum ToastColour {
    RED = "bg-danger",
    ORANGE = "bg-warning",
    GREEN = "bg-success"
}


export class AppContext {

    private _voxelSize: number;
    private _gl: WebGLRenderingContext;
    private _renderer: Renderer;
    private _voxelManager: VoxelManager;
    private _loadedMesh?: Mesh;


    constructor() {     
        this._voxelSize = $("#voxelInput").prop("value");
        
        const gl = (<HTMLCanvasElement>$("#c").get(0)).getContext("webgl");
        if (!gl) {
            throw Error("Could not load WebGL context");
        }
        this._gl = gl;

        this._renderer = new Renderer(this._gl);
        this._voxelManager = new VoxelManager(this._voxelSize);

    }
    
    public load(files: Array<string>) {
        if (files.length != 1) {
            return;
        }
        
        const file = files[0];
        if (!file.endsWith(".obj") && !file.endsWith(".OBJ")) {
            Toast.show("Files must be .obj format", ToastStyle.Failure);
            return;
        }
        
        const parsedPath = path.parse(file);
        
        try {
            this._loadedMesh = new Mesh(file, this._gl);
        } catch (err: any) {
            console.log(err);
            Toast.show("Could not load mesh", ToastStyle.Failure);
            return;
        }
        
        this._renderer.clear();
        this._renderer.registerMesh(this._loadedMesh);
        this._renderer.compile();
        
        $('#inputFile').prop("value", parsedPath.base);
        $('#groupVoxel').removeClass("transparent");
        
        $('#inputVoxelSize').prop('disabled', false);
        $('#buttonVoxelise').prop('disabled', false);
        
        $('#buttonSchematic').prop('disabled', true);
        $('#buttonLitematic').prop('disabled', true);
        
        Toast.show("Loaded successfully", ToastStyle.Success);
    }

    public voxelise() {
        const newVoxelSize = $("#inputVoxelSize").prop('value');
        if (newVoxelSize < 0.001) {
            Toast.show("Voxel size must be at least 0.001", ToastStyle.Failure);
            return;
        }
        this._voxelSize = newVoxelSize;

        if (!this._loadedMesh) {
            return;
        }
        
        try {
            this._voxelManager.clear();
            this._voxelManager.setVoxelSize(this._voxelSize);
            this._voxelManager.voxeliseMesh(this._loadedMesh);
        
            this._renderer.clear();
            this._renderer.registerVoxelMesh(this._voxelManager);
            this._renderer.compile();
        } catch (err: any) {
            Toast.show(err.message, ToastStyle.Failure);
            return;
        }

        $('#groupExport').removeClass("transparent");
        $('#buttonSchematic').prop('disabled', false);
        $('#buttonLitematic').prop('disabled', false);
    
        Toast.show("Voxelised successfully", ToastStyle.Success);
    }

    public exportDisclaimer(exporter: Exporter) {
        const schematicHeight = Math.ceil(this._voxelManager.maxZ - this._voxelManager.minZ);

        let message = "";
        if (schematicHeight > 320) {
            message += `Note, this structure is <b>${schematicHeight}</b> blocks tall, this is larger than the height of a Minecraft world (320 in 1.17, 256 in <=1.16). `;
        }

        const formatDisclaimer = exporter.getFormatDisclaimer();
        if (formatDisclaimer) {
            message += "\n" + formatDisclaimer;
        }

        if (message.length == 0) {
            this.export(exporter);
        } else {
            Modal.setButton("Export", () => { this.export(exporter); });
            Modal.show(message);
        }
    }

    public export(exporter: Exporter) {
        const filePath = remote.dialog.showSaveDialogSync({
            title: "Save structure",
            buttonLabel: "Save",
            filters: [ exporter.getFormatFilter() ]
        });
    
        if (filePath === undefined) {
            console.error("no path");
            return;
        }
    
        try {
            exporter.export(filePath, this._voxelManager);
        } catch (err) {
            console.error(err);
            Toast.show("Failed to export", ToastStyle.Failure)
            return;
        }

        Toast.show("Successfully exported", ToastStyle.Success);
    }


    public draw() {
        this._renderer.draw(this._voxelManager._voxelSize);
    }

}