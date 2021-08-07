import { Renderer } from "./renderer";
import { Mesh } from "./mesh.js";
import { VoxelManager } from "./voxel_manager.js";
import { Vector3 } from "./vector.js";
import { Schematic } from "./schematic.js";
//const dialog = from 'electron').remote.dialog;


class AppContext {

    constructor() {     
        console.log("AppContext constructor");
        this.voxelSize = $("#voxelInput").prop("value");
        this.canvas = $("#c");

        const fov = 30;
        const backgroundColour = new Vector3(0.1, 0.1, 0.1);
        this.renderer = new Renderer(fov, backgroundColour);
        this.voxelManager = new VoxelManager(this.voxelSize);

        this.loadedMesh = null;
    }

    load() {
        const files = $("#fileInput").prop("files");

        if (files.length != 1) {
            return;
        }
    
        const file = files[0];
        if (!file.name.endsWith(".obj") && !file.name.endsWith(".OBJ")) {
            this._showToast("Files must be .obj format", 'danger');
            return;
        }
    
        try {
            this.loadedMesh = new Mesh(files[0].path);
        } catch (err) {
            //this._showToast(`Could not load ${file.name}`, 'danger');
            this._showToast(err.message, 'danger');
            console.log(err);
            return;
        }
        
        this.renderer.clear();
        this.renderer.registerMesh(this.loadedMesh);
        this.renderer.compile();
    
        $('#voxelInput').prop('disabled', false);
        $('#voxelBtn').prop('disabled', false);
        $('#splitBtn').prop('disabled', true);
        $('#exportBtn').prop('disabled', true);
    
        this._showToast(`Successfully load ${file.name}`, 'success');
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

    voxelise() {
        const newVoxelSize = $("#voxelInput").prop('value');
        if (newVoxelSize < 0.001) {
            this._showToast("Voxel size must be at least 0.001", 'danger');
            return;
        }
        this.voxelSize = newVoxelSize;
        
        this.voxelManager.clear();
        this.voxelManager.setVoxelSize(this.voxelSize);
        this.voxelManager.voxeliseMesh(this.loadedMesh);
    
        this.renderer.clear();
        this.renderer.registerVoxelMesh(this.voxelManager);
        this.renderer.compile();

        console.log(this.renderer);

        $('#exportBtn').prop('disabled', false);
        $('#splitBtn').prop('disabled', false);
    
        this._showToast("Note, currently, all blocks are exported as Stone", 'warning');
    }

    async export() {
        const {filePath} = await dialog.showSaveDialog({
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
            const schematic = new Schematic(voxelManager);
            schematic.exportSchematic(filePath);
        } catch (err) {
            this._showToast("Failed to export schematic", 'danger');
            return;
        }
        
        this._showToast("Successfully saved schematic", 'success');
    }

    draw() {
        this.renderer.draw(this.voxelManager._voxelSize);
    }

    _showToast(text, style) {
        $("#toast").removeClass("bg-success");
        $("#toast").removeClass("bg-warning");
        $("#toast").removeClass("bg-danger");
        $("#toast").addClass(`bg-${style}`);
    
        $("#toastText").html(text);
        $("#toast").toast({ delay: 3000 });
        $("#toast").toast('show');
    }

}

module.exports.AppContext = AppContext;