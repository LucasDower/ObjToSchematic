const { Renderer } = require('./src/renderer.js');
const { Mesh } = require('./src/mesh.js');
const { VoxelManager } = require('./src/voxel_manager.js');
const { Vector3 } = require('./src/vector.js');
const { Schematic } = require('./src/schematic.js');

const dialog = require('electron').remote.dialog;

const voxelSize = document.querySelector("#voxelInput").value;
let renderer = new Renderer(voxelSize);
const voxelManager = new VoxelManager(voxelSize);

const canvas = document.querySelector("#c");

const showMeshing = true;
const showFailedAABBs = false;

let loadedMesh = null;

// CHOOSE FILE
document.querySelector("#objBtn").addEventListener('click', () => {
    const files = document.querySelector("#objFile").files;

    if (files.length != 1) {
        return;
    }

    const file = files[0];
    if (!file.name.endsWith(".obj")) {
        console.error("Could not load");
        return;
    }

    try {
        loadedMesh = new Mesh(files[0].path);
    } catch (err) {
        console.error("Could not load");
    }
    
    renderer.clear();
    renderer.registerMesh(loadedMesh);

    document.querySelector("#voxelInput").disabled = false;
    document.querySelector("#voxelBtn").disabled = false;

    renderer.compileRegister();
});


// VOXELISE BUTTON
document.querySelector("#voxelBtn").addEventListener('click', () => {
    const voxelSize = document.querySelector("#voxelInput").value;
    
    renderer.clear();
    voxelManager.clear();

    renderer.setVoxelSize(voxelSize);
    voxelManager.setVoxelSize(voxelSize);

    voxelManager.voxeliseMesh(loadedMesh);

    renderer.clear();
    
    const mesh = voxelManager.buildMesh();
    for (const box of mesh) {
        renderer.registerBox(box.centre, box.size, false);
    }

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

    document.querySelector("#exportBtn").disabled = false;
    
    renderer.compileRegister();
});


// EXPORT SCHEMATIC
document.querySelector("#exportBtn").addEventListener('click', async function() {

    const {filePath} = await dialog.showSaveDialog({
        title: "Save schematic",
        buttonLabel: "Save",
        filters: [{
            name: 'Schematic',
            extensions: ['schematic']
        }]
    });

    const schematic = new Schematic(voxelManager);
    schematic.exportSchematic(filePath);    
});

//const suzanne = new Mesh('./resources/suzanne.obj');
//voxelManager.voxeliseMesh(suzanne);
//const schematic = new Schematic(voxelManager);

function render(time) {
    canvas.height = window.innerHeight - 54;
    canvas.width = window.innerWidth;

    renderer.begin();
    renderer.end();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);