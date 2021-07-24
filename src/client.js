const { Renderer } = require('./src/renderer.js');
const { Mesh } = require('./src/mesh.js');
const { VoxelManager } = require('./src/voxel_manager.js');
const { Vector3 } = require('./src/vector.js');
const { Schematic } = require('./src/schematic.js');

const dialog = require('electron').remote.dialog;

const voxelSize = document.querySelector("#voxelInput").value;

let renderer = new Renderer(30, new Vector3(0.1, 0.1, 0.1));
const voxelManager = new VoxelManager(voxelSize);
const canvas = document.querySelector("#c");

let loadedMesh = null;


function showToastWithText(text, style) {
    $("#toast").removeClass("bg-success");
    $("#toast").removeClass("bg-warning");
    $("#toast").removeClass("bg-danger");
    $("#toast").addClass(`bg-${style}`);

    $("#toastText").html(text);
    $("#toast").toast('show');
}

// CHOOSE FILE
$("#loadBtn").on("click", () => {
    const files = $("#fileInput").prop("files");

    if (files.length != 1) {
        return;
    }

    const file = files[0];
    if (!file.name.endsWith(".obj") && !file.name.endsWith(".OBJ")) {
        showToastWithText(`Could not load ${file.name}`, 'danger');
        return;
    }

    try {
        loadedMesh = new Mesh(files[0].path);
    } catch (err) {
        showToastWithText(`Could not load ${file.name}`, 'danger');
        return;
    }
    
    renderer.clear();
    //renderer.setDebug(true);
    
    renderer.registerMesh(loadedMesh);
    renderer.compile();
    console.log(renderer);

    $('#voxelInput').prop('disabled', false);
    $('#voxelBtn').prop('disabled', false);
    $('#splitBtn').prop('disabled', true);
    $('#exportBtn').prop('disabled', true);

    showToastWithText(`Successfully load ${file.name}`, 'success');
});


// VOXELISE BUTTON
$("#voxelBtn").on("click", () => {
    const voxelSize = $("#voxelInput").prop('value');

    if (voxelSize < 0.001) {
        showToastWithText("Voxel size must be at least 0.001", 'danger');
        return;
    }
    
    voxelManager.clear();
    voxelManager.setVoxelSize(voxelSize);
    voxelManager.voxeliseMesh(loadedMesh);
    //console.log(voxelManager.voxels);

    renderer.clear();
    renderer.registerVoxelMesh(voxelManager);
    
    /*
    const mesh = voxelManager.buildMesh();
    for (const box of mesh) {
        renderer.registerBox(box.centre, box.size, false);
    }
    */

    /*
    if (showMeshing) {
        renderer.setStroke(new Vector3(0.0, 0.0, 0.0));
        for (const box of mesh) {
            renderer.registerBox(box.centre, box.size, true);
        }
    }

    if (showFailedAABBs) {
        renderer.setStroke(new Vector3(0.0, 0.0, 0.0));
        for (const box of voxelManager.failedAABBs) {
            renderer.registerBox(box.centre, box.size, true);
        }
    }
    */
    $('#exportBtn').prop('disabled', false);
    $('#splitBtn').prop('disabled', false);

    const height = (voxelManager.maxY - voxelManager.minY) / voxelSize;
    //console.log(height);
    if (height >= 256) {
        showToastWithText("Schematic won't fit in world", 'warning');
    } else if (height >= 193) {
        showToastWithText("Schematic won't fit above sea-level", 'warning');
    } else {
        showToastWithText("Model successfully voxelised", 'success');
    }

    renderer.compile();
});


// SPLIT BUTTON
$("#splitBtn").on("click", () => {
    const voxelSize = $("#voxelInput").prop('value');
    $("#voxelInput").prop('value', voxelSize / 2);

    voxelManager.splitVoxels();

    renderer.clear();
    renderer.registerVoxelMesh(voxelManager, true);
    renderer.compile();
});


// EXPORT SCHEMATIC
$("#exportBtn").on("click", async () => {

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
        showToastWithText("Failed to export schematic", 'danger');
    }
    
    showToastWithText("Successfully saved schematic", 'success');
});


$(document).resize(function() {
    canvas.height = window.innerHeight - 55;
    canvas.width = window.innerWidth;
});

function render(time) {
    renderer.draw(voxelManager._voxelSize);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);