const { Renderer } = require('./src/renderer.js');
const { Mesh } = require('./src/mesh.js');
const { VoxelManager } = require('./src/voxel_manager.js');
const { Vector3 } = require('./src/vector.js');

//const voxelSize = document.querySelector("#voxelInput").value;
const voxelSize = 0.05;
let renderer = new Renderer(voxelSize);
const voxelManager = new VoxelManager(voxelSize);

const nav = document.querySelector("#nav");
let canvas = document.querySelector("#c");


function resizeCanvas() {
    canvas.height = window.innerHeight - 54;
    canvas.width = window.innerWidth;
}

resizeCanvas();

/*
const suzanneLeft = new Mesh('./resources/suzanne_left.obj');
voxelManager.voxeliseMesh(suzanneLeft);
renderer.registerVoxels(voxelManager.voxels);

const suzanneRight = new Mesh('./resources/suzanne_right.obj');
renderer.registerMesh(suzanneRight);
*/

let loadedMesh = null;

document.querySelector("#objBtn").addEventListener('click', () => {
    const files = document.querySelector("#objFile").files;

    if (files.length != 1) {
        return;
    }
    
    loadedMesh = new Mesh(files[0].path);
    
    renderer.clear();
    renderer.registerMesh(loadedMesh);

    document.querySelector("#voxelInput").disabled = false;
    document.querySelector("#voxelBtn").disabled = false;

    renderer.compileRegister();
});

document.querySelector("#voxelBtn").addEventListener('click', () => {
    const voxelSize = document.querySelector("#voxelInput").value;
    
    renderer.clear();
    voxelManager.clear();

    renderer.setVoxelSize(voxelSize);
    voxelManager.setVoxelSize(voxelSize);
    
    voxelManager.voxeliseMesh(loadedMesh);
    
    renderer.clear();
    renderer.registerVoxels(voxelManager.voxels, false);
    renderer.compileRegister();
});

loadedMesh = new Mesh("./resources/suzanne.obj");
voxelManager.voxeliseMesh(loadedMesh);

const useNew = true;
const useDebug = true;

if (useNew) {
    const mesh = voxelManager.buildMesh();
    for (const box of mesh) {
        renderer.registerBox(box.centre, box.size, useDebug);
    }
} else {
    renderer.registerVoxels(voxelManager.voxels, useDebug);
}

//console.log(voxelManager.voxels.length, "->", k.length, voxelManager.voxels.length/k.length);



//renderer.setStroke(new Vector3(1.0, 0.0, 0.0));
//renderer.registerVoxels(voxelManager.voxels, true);
renderer.compileRegister();


function render(time) {
    resizeCanvas();

    renderer.begin();
    renderer.end();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);