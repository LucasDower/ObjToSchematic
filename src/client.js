const { Renderer } = require('./src/renderer.js');
const { Mesh } = require('./src/mesh.js');
const { VoxelManager } = require('./src/voxel_manager.js');

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

document.querySelector("#objBtn").addEventListener('click', () => {
    const files = document.querySelector("#objFile").files;

    if (files.length != 1) {
        return;
    }
    
    const mesh = new Mesh(files[0].path);
    renderer.clear();

    voxelManager.voxeliseMesh(mesh);
    renderer.registerVoxels(voxelManager.voxels);

    renderer.compileRegister();
});

function render(time) {
    resizeCanvas();

    renderer.begin();
    renderer.end();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);