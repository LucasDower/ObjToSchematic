import { Renderer } from "./renderer";
import { Mesh } from "./mesh";
import { VoxelManager } from "./voxel_manager";
import { Vector3 } from "./vector.js";
import { Schematic } from "./schematic";
//const dialog = from 'electron').remote.dialog;
import remote from "electron";

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

    public load() {
        const files = $("#fileInput").prop("files");

        if (files.length != 1) {
            return;
        }
    
        const file = files[0];
        if (!file.name.endsWith(".obj") && !file.name.endsWith(".OBJ")) {
            this._showToast("Files must be .obj format", ToastColour.RED);
            return;
        }
    
        try {
            this._loadedMesh = new Mesh(files[0].path, this._gl);
        } catch (err) {
            this._showToast(err.message, ToastColour.RED);
            console.log(err);
            return;
        }
        
        this._renderer.clear();
        this._renderer.registerMesh(this._loadedMesh);
        this._renderer.compile();
    
        $('#voxelInput').prop('disabled', false);
        $('#voxelBtn').prop('disabled', false);
        $('#splitBtn').prop('disabled', true);
        $('#exportBtn').prop('disabled', true);
    
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
        
        this._voxelManager.clear();
        this._voxelManager.setVoxelSize(this._voxelSize);
        this._voxelManager.voxeliseMesh(this._loadedMesh);
    
        this._renderer.clear();
        this._renderer.registerVoxelMesh(this._voxelManager);
        this._renderer.compile();
        $('#exportBtn').prop('disabled', false);
        $('#splitBtn').prop('disabled', false);
    
        this._showToast("Note, currently, all blocks are exported as Stone", ToastColour.ORANGE);
    }


    public async export() {
        const {filePath} = await remote.dialog.showSaveDialog({
            title: "Save schematic",
            buttonLabel: "Save",
            filters: [{
                name: 'Schematic',
                extensions: ['schematic']
            }]
        });
    
        if (filePath === undefined) {
            return;
        }
    
        try {
            const schematic = new Schematic(this._voxelManager);
            schematic.exportSchematic(filePath);
        } catch (err) {
            this._showToast("Failed to export schematic", ToastColour.RED);
            return;
        }
        
        this._showToast("Successfully saved schematic", ToastColour.GREEN);
    }


    public draw() {
        this._renderer.draw(this._voxelManager._voxelSize);
    }


    private _showToast(text: string, colour: ToastColour) {
        $("#toast").removeClass(ToastColour.RED);
        $("#toast").removeClass(ToastColour.ORANGE);
        $("#toast").removeClass(ToastColour.GREEN);
        $("#toast").addClass(colour);
    
        $("#toastText").html(text);
        (<any>$("#toast")).toast({ delay: 3000 });
        (<any>$("#toast")).toast('show');
    }

}

module.exports.AppContext = AppContext;