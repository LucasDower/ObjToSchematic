const { Renderer } = require('./src/renderer.js');
const { Vector3 } = require('./src/vector.js');
const { Triangle } = require('./src/triangle.js');
const { Mesh } = require('./src/mesh.js');
const { VoxelManager } = require('./src/voxel_manager.js');

const voxelSize = 0.5;
let renderer = new Renderer(voxelSize);
const voxelManager = new VoxelManager(voxelSize);

const nav = document.querySelector("#nav");
let canvas = document.querySelector("#c");

function resizeCanvas() {
    canvas.height = window.innerHeight - 62;
    canvas.width = window.innerWidth;
}

resizeCanvas();

console.log(nav.getBoundingClientRect());

/*
const suzanneLeft = new Mesh('./resources/suzanne_left.obj');
voxelManager.voxeliseMesh(suzanneLeft);
renderer.registerVoxels(voxelManager.voxels);

const suzanneRight = new Mesh('./resources/suzanne_right.obj');
renderer.registerMesh(suzanneRight);
*/

renderer.registerVoxel(new Vector3(0, 0, 0), true);
renderer.compileRegister();

document.querySelector("#objBtn").addEventListener('click', () => {
    const files = document.querySelector("#objFile").files;
    //console.log(files[0].path);
    if (files.length != 1) {
        return;
    }
    const mesh = new Mesh(files[0].path);
    renderer.clear();

    voxelManager.voxeliseMesh(mesh);
    renderer.registerVoxels(voxelManager.voxels);

    //renderer.registerMesh(mesh);
    renderer.compileRegister();
    console.log("done");
});

function render(time) {
    resizeCanvas();

    renderer.begin();
    renderer.end();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);