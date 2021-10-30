import { Exporter } from "./schematic";
import { VoxelManager } from "./voxel_manager";
import { Renderer } from "./renderer";
import { Toast, ToastStyle } from "./ui/toast";
import { Modal } from "./ui/modal";
import { Mesh } from "./mesh";

import { remote } from "electron"; 
import path from "path";


export class AppContext {

    private _voxelSize: number;
    private _gl: WebGLRenderingContext;
    private _loadedMesh?: Mesh;

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
    }
    
    public load() {
        const files = remote.dialog.showOpenDialogSync({
            title: "Load Waveform .obj file",
            buttonLabel: "Load",
            filters: [{
                name: 'Waveform obj file',
                extensions: ['obj']
            }]
        });

        if (!files || files.length != 1) {
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
            this._loadedMesh.loadTextures(this._gl);

        } catch (err: any) {
            console.error(err);
            Toast.show("Could not load mesh", ToastStyle.Failure);
            return;
        }
        
        const renderer = Renderer.Get;
        renderer.clear();
        renderer.registerMesh(this._loadedMesh);
        renderer.compile();
    
        $('#inputFile').prop("value", parsedPath.base);
        $('#groupVoxel').removeClass("transparent");
        
        $('#inputVoxelSize').prop('disabled', false);
        $('#buttonVoxelise').prop('disabled', false);
        
        $('#buttonSchematic').prop('disabled', true);
        $('#buttonLitematic').prop('disabled', true);
    
        Toast.show("Loaded successfully", ToastStyle.Success);
    }

    public voxeliseDisclaimer() {
        //this._modalVoxelise.show();
        this.voxelise();
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
            const voxelManager = VoxelManager.Get;
            voxelManager.clear();
            voxelManager.setVoxelSize(this._voxelSize);
            voxelManager.voxeliseMesh(this._loadedMesh);
        
            const renderer = Renderer.Get;
            renderer.clear();
            renderer.registerVoxelMesh();
            renderer.compile();
        } catch (err: any) {
            console.error(err.message);
            Toast.show("Could not register voxel mesh", ToastStyle.Failure);
            return;
        }

        $('#groupExport').removeClass("transparent");
        $('#buttonSchematic').prop('disabled', false);
        $('#buttonLitematic').prop('disabled', false);
    
        Toast.show("Voxelised successfully", ToastStyle.Success);
    }

    public exportDisclaimer(exporter: Exporter) {
        const voxelManager = VoxelManager.Get;
        const schematicHeight = Math.ceil(voxelManager.maxZ - voxelManager.minZ);

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
            return;
        }
    
        try {
            exporter.export(filePath, VoxelManager.Get);
        } catch (err) {
            console.error(err);
            Toast.show("Failed to export", ToastStyle.Failure)
            return;
        }

        Toast.show("Successfully exported", ToastStyle.Success);
    }

    public draw() {
        Renderer.Get.draw(VoxelManager.Get._voxelSize);
    }

}